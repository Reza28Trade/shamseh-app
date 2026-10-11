import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';

@Injectable()
export class CounselingChatService {
  constructor(private readonly prisma: PrismaService) {}

  private requireAdmin(user: AuthenticatedUser) {
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'STAFF') throw new ForbiddenException('Admin access required');
  }

  private async profileForUser(userId: string) {
    const profile = await this.prisma.counselorProfile.findUnique({ where: { userId } });
    if (!profile || !profile.isActive) throw new ForbiddenException('Active counselor profile required');
    return profile;
  }

  async listCounselors(user: AuthenticatedUser) {
    this.requireAdmin(user);
    return this.prisma.counselorProfile.findMany({
      orderBy: { displayName: 'asc' },
      select: { id: true, displayName: true, bio: true, isActive: true, createdAt: true, user: { select: { id: true, username: true, status: true } } },
    });
  }

  async createCounselor(user: AuthenticatedUser, input: { username?: string; password?: string; displayName?: string; bio?: string }) {
    this.requireAdmin(user);
    const username = input.username?.trim();
    const displayName = input.displayName?.trim();
    if (!username || !displayName || !input.password || input.password.length < 10) {
      throw new BadRequestException('Username, display name, and a password of at least 10 characters are required');
    }
    if (await this.prisma.user.findUnique({ where: { username }, select: { id: true } })) {
      throw new ConflictException('Username is already in use');
    }
    const passwordHash = await argon2.hash(input.password);
    return this.prisma.$transaction(async tx => {
      const account = await tx.user.create({
        data: { username, passwordHash, role: UserRole.COUNSELOR, status: 'ACTIVE' },
        select: { id: true, username: true, status: true },
      });
      const profile = await tx.counselorProfile.create({
        data: { userId: account.id, displayName, bio: input.bio?.trim() || null },
        select: { id: true, displayName: true, bio: true, isActive: true, createdAt: true },
      });
      await tx.auditLog.create({ data: { actorUserId: user.id, action: 'COUNSELOR_CREATED', entityType: 'CounselorProfile', entityId: profile.id, metadata: { username } } });
      return { ...profile, user: account };
    });
  }

  async setCounselorActive(user: AuthenticatedUser, counselorId: string, isActive: boolean) {
    this.requireAdmin(user);
    if (typeof isActive !== 'boolean') throw new BadRequestException('isActive must be a boolean');
    const profile = await this.prisma.counselorProfile.findUnique({ where: { id: counselorId }, select: { id: true, userId: true } });
    if (!profile) throw new NotFoundException('Counselor not found');
    return this.prisma.$transaction(async tx => {
      await tx.counselorProfile.update({ where: { id: counselorId }, data: { isActive } });
      await tx.user.update({ where: { id: profile.userId }, data: { status: isActive ? 'ACTIVE' : 'INACTIVE' } });
      await tx.auditLog.create({ data: { actorUserId: user.id, action: isActive ? 'COUNSELOR_ACTIVATED' : 'COUNSELOR_DEACTIVATED', entityType: 'CounselorProfile', entityId: counselorId } });
      return { id: counselorId, isActive };
    });
  }

  async assignStudent(user: AuthenticatedUser, studentId: string, counselorId: string) {
    this.requireAdmin(user);
    if (!studentId || !counselorId) throw new BadRequestException('studentId and counselorId are required');
    const [student, counselor] = await Promise.all([
      this.prisma.student.findUnique({ where: { id: studentId }, select: { id: true, fullName: true } }),
      this.prisma.counselorProfile.findUnique({ where: { id: counselorId }, select: { id: true, displayName: true, isActive: true } }),
    ]);
    if (!student) throw new NotFoundException('Student not found');
    if (!counselor || !counselor.isActive) throw new NotFoundException('Active counselor not found');
    return this.prisma.$transaction(async tx => {
      const active = await tx.counselingAssignment.findFirst({ where: { studentId, endedAt: null } });
      if (active?.counselorId === counselorId) return active;
      if (active) await tx.counselingAssignment.update({ where: { id: active.id }, data: { endedAt: new Date() } });
      const assignment = await tx.counselingAssignment.create({ data: { studentId, counselorId, assignedById: user.id } });
      await tx.counselingConversation.upsert({
        where: { studentId_counselorId: { studentId, counselorId } },
        create: { studentId, counselorId },
        update: {},
      });
      await tx.auditLog.create({ data: { actorUserId: user.id, action: active ? 'COUNSELOR_TRANSFERRED' : 'COUNSELOR_ASSIGNED', entityType: 'CounselingAssignment', entityId: assignment.id, metadata: { studentId, counselorId, previousCounselorId: active?.counselorId ?? null } } });
      return assignment;
    });
  }

  async listAssignments(user: AuthenticatedUser) {
    this.requireAdmin(user);
    return this.prisma.counselingAssignment.findMany({
      orderBy: { startedAt: 'desc' },
      include: { student: { select: { id: true, fullName: true, nationalId: true } }, counselor: { select: { id: true, displayName: true } }, assignedBy: { select: { id: true, username: true } } },
    });
  }

  async listConversations(user: AuthenticatedUser) {
    let where: any = {};
    if (user.role === 'STUDENT') {
      if (!user.studentId) throw new ForbiddenException('Student account required');
      const active = await this.prisma.counselingAssignment.findFirst({ where: { studentId: user.studentId, endedAt: null }, select: { counselorId: true } });
      if (!active) return [];
      where = { studentId: user.studentId, counselorId: active.counselorId };
    } else if (user.role === 'COUNSELOR') {
      const profile = await this.profileForUser(user.id);
      where = {
        counselorId: profile.id,
        student: {
          counselingAssignments: {
            some: { counselorId: profile.id, endedAt: null },
          },
        },
      };
    } else {
      this.requireAdmin(user);
    }
    const conversations = await this.prisma.counselingConversation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        student: { select: { id: true, fullName: true, nationalId: true } },
        counselor: { select: { id: true, displayName: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { id: true, content: true, senderUserId: true, readAt: true, createdAt: true } },
        _count: { select: { messages: true } },
      },
    });
    if (user.role === 'STAFF' || user.role === 'SUPER_ADMIN') {
      await this.prisma.auditLog.create({ data: { actorUserId: user.id, action: 'COUNSELING_CONVERSATIONS_VIEWED', entityType: 'CounselingConversation', metadata: { count: conversations.length } } });
    }
    return conversations;
  }

  async getMessages(user: AuthenticatedUser, conversationId: string) {
    const conversation = await this.authorizeConversation(user, conversationId);
    const messages = await this.prisma.counselingMessage.findMany({ where: { conversationId: conversation.id }, orderBy: { createdAt: 'asc' }, select: { id: true, content: true, senderUserId: true, readAt: true, createdAt: true } });
    await this.prisma.counselingMessage.updateMany({
      where: { conversationId, senderUserId: { not: user.id }, readAt: null },
      data: { readAt: new Date() },
    });
    if (user.role === 'SUPER_ADMIN' || user.role === 'STAFF') {
      await this.prisma.auditLog.create({ data: { actorUserId: user.id, action: 'COUNSELING_HISTORY_VIEWED', entityType: 'CounselingConversation', entityId: conversationId } });
    }
    return messages;
  }

  async sendMessage(user: AuthenticatedUser, conversationId: string, contentInput: string) {
    if (user.role !== 'STUDENT' && user.role !== 'COUNSELOR') {
      throw new ForbiddenException('Administrators can view counseling history but cannot send messages');
    }
    const content = typeof contentInput === 'string' ? contentInput.trim() : '';
    if (!content || content.length > 5000) throw new BadRequestException('Message must contain 1–5000 characters');
    const conversation = await this.authorizeConversation(user, conversationId);
    const message = await this.prisma.counselingMessage.create({ data: { conversationId, senderUserId: user.id, content } });
    await this.prisma.counselingConversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });
    return message;
  }

  private async authorizeConversation(user: AuthenticatedUser, conversationId: string) {
    const conversation = await this.prisma.counselingConversation.findUnique({ where: { id: conversationId }, select: { id: true, studentId: true, counselorId: true } });
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (user.role === 'STUDENT' && user.studentId === conversation.studentId) {
      const active = await this.prisma.counselingAssignment.findFirst({ where: { studentId: user.studentId, counselorId: conversation.counselorId, endedAt: null }, select: { id: true } });
      if (active) return conversation;
      throw new ForbiddenException('This is not your current counselor conversation');
    }
    if (user.role === 'COUNSELOR') {
      const profile = await this.profileForUser(user.id);
      if (profile.id === conversation.counselorId) {
        const active = await this.prisma.counselingAssignment.findFirst({ where: { studentId: conversation.studentId, counselorId: profile.id, endedAt: null }, select: { id: true } });
        if (active) return conversation;
      }
      throw new ForbiddenException('Conversation is not currently assigned to you');
    }
    this.requireAdmin(user);
    return conversation;
  }
}
