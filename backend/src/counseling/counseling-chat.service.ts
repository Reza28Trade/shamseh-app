import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { basename, extname, join } from 'path';

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
    try {
      return await this.prisma.$transaction(async tx => {
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
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException('Username is already in use. Reload the page and choose another username.');
      }
      throw error;
    }
  }

  async setCounselorActive(user: AuthenticatedUser, counselorId: string, isActive: boolean) {
    this.requireAdmin(user);
    if (typeof isActive !== 'boolean') throw new BadRequestException('isActive must be a boolean');
    try {
      return await this.prisma.$transaction(async tx => {
        const profile = await tx.counselorProfile.findUnique({ where: { id: counselorId }, select: { id: true, userId: true } });
        if (!profile) throw new NotFoundException('Counselor not found');
        if (!isActive) {
          const activeAssignments = await tx.counselingAssignment.count({ where: { counselorId, endedAt: null } });
          if (activeAssignments > 0) {
            throw new ConflictException('Transfer all currently assigned students before deactivating this counselor');
          }
        }
        await tx.counselorProfile.update({ where: { id: counselorId }, data: { isActive } });
        await tx.user.update({ where: { id: profile.userId }, data: { status: isActive ? 'ACTIVE' : 'INACTIVE' } });
        await tx.auditLog.create({ data: { actorUserId: user.id, action: isActive ? 'COUNSELOR_ACTIVATED' : 'COUNSELOR_DEACTIVATED', entityType: 'CounselorProfile', entityId: counselorId } });
        return { id: counselorId, isActive };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error: any) {
      if (error?.code === 'P2034') {
        throw new ConflictException('Counselor assignments changed concurrently. Reload and try again.');
      }
      throw error;
    }
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

    try {
      return await this.prisma.$transaction(async tx => {
        const activeCounselor = await tx.counselorProfile.findUnique({
          where: { id: counselorId },
          select: { isActive: true },
        });
        if (!activeCounselor?.isActive) throw new ConflictException('Counselor is no longer active. Reload and try again.');
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
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error: any) {
      if (error?.code === 'P2034') {
        throw new ConflictException('The assignment changed concurrently. Reload the page and try again.');
      }
      if (error?.code === 'P2002') {
        throw new ConflictException('A current counselor assignment already exists. Reload the page and try again.');
      }
      throw error;
    }
  }

  async listAssignments(user: AuthenticatedUser) {
    this.requireAdmin(user);
    return this.prisma.counselingAssignment.findMany({
      orderBy: { startedAt: 'desc' },
      include: { student: { select: { id: true, fullName: true, nationalId: true } }, counselor: { select: { id: true, displayName: true } }, assignedBy: { select: { id: true, username: true } } },
    });
  }

  async listConversations(user: AuthenticatedUser) {
    // Keep assignment authorization and the conversation/last-message read in one
    // serializable transaction so a transfer cannot expose a previous counselor's
    // last message through this summary endpoint.
    try {
      return await this.prisma.$transaction(async tx => {
        let where: any = {};
        if (user.role === 'STUDENT') {
          if (!user.studentId) throw new ForbiddenException('Student account required');
          const active = await tx.counselingAssignment.findFirst({
            where: { studentId: user.studentId, endedAt: null },
            select: { counselorId: true },
          });
          if (!active) return [];
          where = { studentId: user.studentId, counselorId: active.counselorId };
        } else if (user.role === 'COUNSELOR') {
          const profile = await tx.counselorProfile.findUnique({
            where: { userId: user.id },
            select: { id: true, isActive: true },
          });
          if (!profile?.isActive) throw new ForbiddenException('Active counselor profile required');
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

        const conversations = await tx.counselingConversation.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          include: {
            student: { select: { id: true, fullName: true, nationalId: true } },
            counselor: { select: { id: true, displayName: true } },
            messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { id: true, content: true, senderUserId: true, readAt: true, createdAt: true, attachmentName: true, attachmentMimeType: true, attachmentSize: true } },
            _count: { select: { messages: true } },
          },
        });
        if (user.role === 'STAFF' || user.role === 'SUPER_ADMIN') {
          await tx.auditLog.create({
            data: {
              actorUserId: user.id,
              action: 'COUNSELING_CONVERSATIONS_VIEWED',
              entityType: 'CounselingConversation',
              metadata: { count: conversations.length },
            },
          });
        }
        return conversations;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error: any) {
      if (error?.code === 'P2034') {
        throw new ConflictException('Counseling assignments changed concurrently. Reload and try again.');
      }
      throw error;
    }
  }

  async getMessages(user: AuthenticatedUser, conversationId: string) {
    // Authorize, read, and update read receipts in one serializable transaction.
    // Keeping authorization inside the transaction prevents a transfer between
    // the permission check and the message query from exposing the old transcript.
    try {
      return await this.prisma.$transaction(async tx => {
        const conversation = await tx.counselingConversation.findUnique({
          where: { id: conversationId },
          select: { id: true, studentId: true, counselorId: true },
        });
        if (!conversation) throw new NotFoundException('Conversation not found');

        if (user.role === 'STUDENT') {
          const active = user.studentId === conversation.studentId
            ? await tx.counselingAssignment.findFirst({
                where: { studentId: user.studentId, counselorId: conversation.counselorId, endedAt: null },
                select: { id: true },
              })
            : null;
          if (!active) throw new ForbiddenException('This is not your current counselor conversation');
        } else if (user.role === 'COUNSELOR') {
          const profile = await tx.counselorProfile.findUnique({
            where: { userId: user.id },
            select: { id: true, isActive: true },
          });
          const active = profile?.isActive && profile.id === conversation.counselorId
            ? await tx.counselingAssignment.findFirst({
                where: { studentId: conversation.studentId, counselorId: profile.id, endedAt: null },
                select: { id: true },
              })
            : null;
          if (!active) throw new ForbiddenException('Conversation is not currently assigned to you');
        } else {
          this.requireAdmin(user);
        }

        // Only participants affect read receipts; admin history review is read-only.
        // Mark incoming messages read before selecting them so this response includes
        // the updated readAt values rather than returning stale receipts for one poll.
        if (user.role === 'STUDENT' || user.role === 'COUNSELOR') {
          await tx.counselingMessage.updateMany({
            where: { conversationId, senderUserId: { not: user.id }, readAt: null },
            data: { readAt: new Date() },
          });
        }

        const messages = await tx.counselingMessage.findMany({
          where: { conversationId: conversation.id },
          orderBy: { createdAt: 'asc' },
          select: { id: true, content: true, senderUserId: true, sender: { select: { role: true } }, readAt: true, createdAt: true, attachmentName: true, attachmentMimeType: true, attachmentSize: true },
        });
        if (user.role === 'SUPER_ADMIN' || user.role === 'STAFF') {
          await tx.auditLog.create({
            data: {
              actorUserId: user.id,
              action: 'COUNSELING_HISTORY_VIEWED',
              entityType: 'CounselingConversation',
              entityId: conversationId,
            },
          });
        }
        return messages;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error: any) {
      if (error?.code === 'P2034') {
        throw new ConflictException('The conversation assignment changed concurrently. Reload and try again.');
      }
      throw error;
    }
  }

  async sendMessage(
    user: AuthenticatedUser,
    conversationId: string,
    contentInput: string,
    attachment?: { storageKey: string; name: string; mimeType: string; size: number },
  ) {
    if (user.role !== 'STUDENT' && user.role !== 'COUNSELOR') {
      throw new ForbiddenException('Administrators can view counseling history but cannot send messages');
    }
    const content = typeof contentInput === 'string' ? contentInput.trim() : '';
    if ((!content && !attachment) || content.length > 5000) throw new BadRequestException('Message must contain up to 5000 characters or include a file attachment');

    // Re-check the active assignment in the same serializable transaction as the write.
    // This prevents a message from being sent through a stale conversation after a transfer.
    try {
      return await this.prisma.$transaction(async tx => {
        const conversation = await tx.counselingConversation.findUnique({
          where: { id: conversationId },
          select: { id: true, studentId: true, counselorId: true },
        });
        if (!conversation) throw new NotFoundException('Conversation not found');

        let participantIsAuthorized = false;
        if (user.role === 'STUDENT' && user.studentId === conversation.studentId) {
          participantIsAuthorized = !!(await tx.counselingAssignment.findFirst({
            where: { studentId: user.studentId, counselorId: conversation.counselorId, endedAt: null },
            select: { id: true },
          }));
        } else if (user.role === 'COUNSELOR') {
          const profile = await tx.counselorProfile.findUnique({
            where: { userId: user.id },
            select: { id: true, isActive: true },
          });
          if (profile?.isActive && profile.id === conversation.counselorId) {
            participantIsAuthorized = !!(await tx.counselingAssignment.findFirst({
              where: { studentId: conversation.studentId, counselorId: profile.id, endedAt: null },
              select: { id: true },
            }));
          }
        }

        if (!participantIsAuthorized) {
          throw new ForbiddenException('Conversation is not currently assigned to you');
        }

        const message = await tx.counselingMessage.create({
          data: {
            conversationId, senderUserId: user.id, content,
            ...(attachment ? {
              attachmentStorageKey: attachment.storageKey,
              attachmentName: attachment.name,
              attachmentMimeType: attachment.mimeType,
              attachmentSize: attachment.size,
            } : {}),
          },
        });
        await tx.counselingConversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });
        return message;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error: any) {
      if (error?.code === 'P2034') {
        throw new ConflictException('The conversation assignment changed concurrently. Reload and try again.');
      }
      throw error;
    }
  }

  async storeAndSendAttachment(user: AuthenticatedUser, conversationId: string, contentInput: string, file: any) {
    if (!file?.buffer) throw new BadRequestException('فایل پیوست انتخاب نشده است.');
    const extension = extname(String(file.originalname || '')).toLowerCase();
    const mimeByExtension: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
      '.txt': 'text/plain',
      '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint', '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.mp4': 'video/mp4', '.webm': 'video/webm',
    };
    if (!mimeByExtension[extension]) throw new BadRequestException('این نوع فایل پشتیبانی نمی‌شود.');
    if (file.size > 10 * 1024 * 1024) throw new BadRequestException('حداکثر حجم فایل ۱۰ مگابایت است.');
    const originalName = basename(String(file.originalname || 'attachment').replace(/\\/g, '/')).replace(/[\r\n\0]/g, '').slice(0, 180) || 'attachment';
    const storageKey = randomUUID() + extension;
    const directory = process.env.FILE_STORAGE_PATH || '/opt/shamseh-app/storage/files';
    mkdirSync(directory, { recursive: true });
    const fullPath = join(directory, storageKey);
    writeFileSync(fullPath, file.buffer, { flag: 'wx', mode: 0o640 });
    try {
      return await this.sendMessage(user, conversationId, contentInput?.trim() || '', {
        storageKey, name: originalName, mimeType: mimeByExtension[extension], size: file.size,
      });
    } catch (error) {
      if (existsSync(fullPath)) unlinkSync(fullPath);
      throw error;
    }
  }

  async getAttachmentForDownload(user: AuthenticatedUser, conversationId: string, messageId: string) {
    try {
      return await this.prisma.$transaction(async tx => {
        const conversation = await tx.counselingConversation.findUnique({
          where: { id: conversationId },
          select: { id: true, studentId: true, counselorId: true },
        });
        if (!conversation) throw new NotFoundException('Conversation not found');
        if (user.role === 'STUDENT') {
          const active = user.studentId === conversation.studentId
            ? await tx.counselingAssignment.findFirst({
                where: { studentId: user.studentId, counselorId: conversation.counselorId, endedAt: null },
                select: { id: true },
              })
            : null;
          if (!active) throw new ForbiddenException('This is not your current counselor conversation');
        } else if (user.role === 'COUNSELOR') {
          const profile = await tx.counselorProfile.findUnique({
            where: { userId: user.id }, select: { id: true, isActive: true },
          });
          const active = profile?.isActive && profile.id === conversation.counselorId
            ? await tx.counselingAssignment.findFirst({
                where: { studentId: conversation.studentId, counselorId: profile.id, endedAt: null },
                select: { id: true },
              })
            : null;
          if (!active) throw new ForbiddenException('Conversation is not currently assigned to you');
        } else {
          this.requireAdmin(user);
          await tx.auditLog.create({
            data: { actorUserId: user.id, action: 'COUNSELING_ATTACHMENT_DOWNLOADED', entityType: 'CounselingMessage', entityId: messageId },
          });
        }
        const message = await tx.counselingMessage.findFirst({
          where: { id: messageId, conversationId },
          select: { attachmentStorageKey: true, attachmentName: true, attachmentMimeType: true },
        });
        if (!message?.attachmentStorageKey || !message.attachmentName || !message.attachmentMimeType) {
          throw new NotFoundException('Attachment not found');
        }
        const directory = process.env.FILE_STORAGE_PATH || '/opt/shamseh-app/storage/files';
        const path = join(directory, basename(message.attachmentStorageKey));
        if (!existsSync(path)) throw new NotFoundException('Attachment file not found');
        return { path, name: message.attachmentName, mimeType: message.attachmentMimeType };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error: any) {
      if (error?.code === 'P2034') throw new ConflictException('Conversation assignment changed concurrently. Reload and try again.');
      throw error;
    }
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
