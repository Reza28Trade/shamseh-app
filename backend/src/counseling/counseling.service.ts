import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CounselingRequestStatus, CounselingSlotStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';

@Injectable()
export class CounselingService {
  constructor(private readonly prisma: PrismaService) {}

  private requireAdmin(user: AuthenticatedUser) {
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'STAFF') {
      throw new ForbiddenException('Admin access required');
    }
  }

  async listSlots(user: AuthenticatedUser) {
    if (user.role === 'STUDENT') {
      return this.prisma.counselingSlot.findMany({
        where: { status: CounselingSlotStatus.AVAILABLE, startAt: { gte: new Date() } },
        orderBy: { startAt: 'asc' },
      });
    }
    this.requireAdmin(user);
    return this.prisma.counselingSlot.findMany({
      orderBy: { startAt: 'asc' },
      include: { request: { select: { id: true, status: true, student: { select: { id: true, fullName: true, nationalId: true } } } } },
    });
  }

  async createSlot(user: AuthenticatedUser, startAt: string) {
    this.requireAdmin(user);
    const date = new Date(startAt);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Invalid start time');
    if (date <= new Date()) throw new BadRequestException('Counseling slot must be in the future');
    return this.prisma.counselingSlot.create({ data: { startAt: date } });
  }

  async updateSlot(user: AuthenticatedUser, slotId: string, status: CounselingSlotStatus) {
    this.requireAdmin(user);
    if (!Object.values(CounselingSlotStatus).includes(status)) throw new BadRequestException('Invalid slot status');
    const slot = await this.prisma.counselingSlot.findUnique({ where: { id: slotId }, include: { request: true } });
    if (!slot) throw new NotFoundException('Counseling slot not found');
    if (status === CounselingSlotStatus.AVAILABLE && slot.request) throw new ConflictException('Booked slot cannot be made available');
    return this.prisma.counselingSlot.update({ where: { id: slotId }, data: { status } });
  }

  async removeSlot(user: AuthenticatedUser, slotId: string) {
    this.requireAdmin(user);
    const slot = await this.prisma.counselingSlot.findUnique({ where: { id: slotId }, include: { request: true } });
    if (!slot) throw new NotFoundException('Counseling slot not found');
    if (slot.request) throw new ConflictException('Booked slot cannot be deleted');
    return this.prisma.counselingSlot.delete({ where: { id: slotId } });
  }

  async book(user: AuthenticatedUser, slotId: string) {
    if (user.role !== 'STUDENT' || !user.studentId) throw new ForbiddenException('Student access required');

    try {
      return await this.prisma.$transaction(async tx => {
        const slot = await tx.counselingSlot.updateMany({
          where: { id: slotId, status: CounselingSlotStatus.AVAILABLE, startAt: { gt: new Date() } },
          data: { status: CounselingSlotStatus.BOOKED },
        });
        if (slot.count !== 1) throw new ConflictException('This counseling slot is no longer available');

        const existing = await tx.counselingRequest.findFirst({
          where: { studentId: user.studentId!, status: { in: [CounselingRequestStatus.PENDING, CounselingRequestStatus.APPROVED] } },
          include: { slot: { select: { startAt: true } } },
        });
        if (existing) throw new ConflictException('You already have an active counseling request');

        return tx.counselingRequest.create({
          data: { studentId: user.studentId!, slotId },
          include: { slot: { select: { id: true, startAt: true } } },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error: any) {
      if (error?.code === 'P2034') throw new ConflictException('Please try again');
      throw error;
    }
  }

  async listMine(user: AuthenticatedUser) {
    if (user.role !== 'STUDENT' || !user.studentId) throw new ForbiddenException('Student access required');
    return this.prisma.counselingRequest.findMany({
      where: { studentId: user.studentId },
      orderBy: { createdAt: 'desc' },
      include: { slot: { select: { id: true, startAt: true, status: true } } },
    });
  }

  async cancelMine(user: AuthenticatedUser, requestId: string) {
    if (user.role !== 'STUDENT' || !user.studentId) throw new ForbiddenException('Student access required');
    return this.prisma.$transaction(async tx => {
      const request = await tx.counselingRequest.findUnique({ where: { id: requestId }, select: { id: true, studentId: true, status: true, slotId: true } });
      if (!request || request.studentId !== user.studentId) throw new NotFoundException('Counseling request not found');
      if (request.status !== CounselingRequestStatus.PENDING && request.status !== CounselingRequestStatus.APPROVED) {
        throw new ConflictException('This counseling request cannot be cancelled');
      }
      const updated = await tx.counselingRequest.update({ where: { id: requestId }, data: { status: CounselingRequestStatus.CANCELLED } });
      await tx.counselingSlot.update({ where: { id: request.slotId }, data: { status: CounselingSlotStatus.AVAILABLE } });
      return updated;
    });
  }

  async listRequests(user: AuthenticatedUser) {
    this.requireAdmin(user);
    return this.prisma.counselingRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { id: true, fullName: true, nationalId: true, phone: true } },
        slot: { select: { id: true, startAt: true, status: true } },
      },
    });
  }

  async updateRequest(user: AuthenticatedUser, requestId: string, status: CounselingRequestStatus) {
    this.requireAdmin(user);
    if (!Object.values(CounselingRequestStatus).includes(status)) throw new BadRequestException('Invalid request status');
    const request = await this.prisma.counselingRequest.findUnique({ where: { id: requestId }, include: { slot: true } });
    if (!request) throw new NotFoundException('Counseling request not found');
    if (request.status === CounselingRequestStatus.CANCELLED) throw new ConflictException('Cancelled request cannot be changed');
    if (status === CounselingRequestStatus.CANCELLED || status === CounselingRequestStatus.REJECTED) {
      return this.prisma.$transaction(async tx => {
        const updated = await tx.counselingRequest.update({ where: { id: requestId }, data: { status } });
        await tx.counselingSlot.update({ where: { id: request.slotId }, data: { status: CounselingSlotStatus.AVAILABLE } });
        return updated;
      });
    }
    return this.prisma.counselingRequest.update({ where: { id: requestId }, data: { status } });
  }

  async getStudentSummary(user: AuthenticatedUser, studentId: string) {
    this.requireAdmin(user);
    const completed = await this.prisma.counselingRequest.count({ where: { studentId, status: CounselingRequestStatus.COMPLETED } });
    return { completedCounselingSessions: completed };
  }
}
