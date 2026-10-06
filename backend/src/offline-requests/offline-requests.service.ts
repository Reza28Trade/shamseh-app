import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { CreateOfflineRequestDto } from './dto/create-offline-request.dto';
import { ReviewOfflineRequestDto } from './dto/review-offline-request.dto';
import { UpdateOfflineRequestDto } from './dto/update-offline-request.dto';

const MAX_REQUESTS_PER_COURSE = 3;

function ensureOfflineRequestDay() {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tehran',
    weekday: 'short',
  }).format(new Date());

  if (weekday !== 'Wed' && weekday !== 'Thu') {
    throw new BadRequestException('Offline requests are only available on Wednesdays and Thursdays');
  }
}

@Injectable()
export class OfflineRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  private requireAdmin(user: AuthenticatedUser) {
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'STAFF') {
      throw new ForbiddenException('Admin access required');
    }
  }

  async create(user: AuthenticatedUser, dto: CreateOfflineRequestDto) {
    ensureOfflineRequestDay();

    if (user.role !== 'STUDENT' || !user.studentId) {
      throw new ForbiddenException('Student access required');
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: user.studentId,
          courseId: dto.courseId,
        },
      },
      select: { status: true },
    });

    if (!enrollment || enrollment.status !== 'ACTIVE') {
      throw new ForbiddenException('Course access denied');
    }

    const session = await this.prisma.courseSession.findUnique({
      where: { id: dto.sessionId },
      select: { id: true, courseId: true },
    });

    if (!session) throw new NotFoundException('Session not found');
    if (session.courseId !== dto.courseId) {
      throw new BadRequestException('Session does not belong to the selected course');
    }
    

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const count = await tx.offlineRequest.count({
            where: {
              studentId: user.studentId!,
              courseId: dto.courseId,
            },
          });

          if (count >= MAX_REQUESTS_PER_COURSE) {
            throw new ConflictException(
              'Offline request limit reached for this course (maximum 3 requests)',
            );
          }

          const existing = await tx.offlineRequest.findFirst({
            where: {
              studentId: user.studentId!,
              courseId: dto.courseId,
              sessionId: dto.sessionId,
            },
            select: { id: true },
          });

          if (existing) {
            throw new ConflictException('An offline request already exists for this session');
          }

          return tx.offlineRequest.create({
            data: {
              studentId: user.studentId!,
              courseId: dto.courseId,
              sessionId: dto.sessionId,
            },
            include: {
              course: { select: { id: true, title: true } },
              session: {
                select: { id: true, sessionNumber: true },
              },
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error: any) {
      if (error?.code === 'P2034') {
        throw new ConflictException('Please try again');
      }
      throw error;
    }
  }

  async listMine(user: AuthenticatedUser) {
    if (user.role !== 'STUDENT' || !user.studentId) {
      throw new ForbiddenException('Student access required');
    }

    return this.prisma.offlineRequest.findMany({
      where: { studentId: user.studentId },
      orderBy: { createdAt: 'desc' },
      include: {
        course: { select: { id: true, title: true } },
        session: {
          select: { id: true, title: true, sessionNumber: true, sessionDate: true, status: true },
        },
      },
    });
  }

  async listAll(user: AuthenticatedUser) {
    this.requireAdmin(user);

    return this.prisma.offlineRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { id: true, fullName: true, nationalId: true } },
        course: { select: { id: true, title: true } },
        session: {
          select: { id: true, title: true, sessionNumber: true, sessionDate: true, status: true },
        },
        reviewer: { select: { id: true, username: true } },
      },
    });
  }

  async update(user: AuthenticatedUser, requestId: string, dto: UpdateOfflineRequestDto) {
    ensureOfflineRequestDay();

    if (user.role !== 'STUDENT' || !user.studentId) {
      throw new ForbiddenException('Student access required');
    }

    const request = await this.prisma.offlineRequest.findUnique({
      where: { id: requestId },
      select: { id: true, studentId: true, courseId: true, sessionId: true, status: true },
    });

    if (!request || request.studentId !== user.studentId) {
      throw new NotFoundException('Offline request not found');
    }
    if (request.status !== 'PENDING') {
      throw new ConflictException('Only pending requests can be edited');
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId: user.studentId, courseId: dto.courseId } },
      select: { status: true },
    });
    if (!enrollment || enrollment.status !== 'ACTIVE') {
      throw new ForbiddenException('Course access denied');
    }

    const session = await this.prisma.courseSession.findUnique({
      where: { id: dto.sessionId },
      select: { id: true, courseId: true },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.courseId !== dto.courseId) {
      throw new BadRequestException('Session does not belong to the selected course');
    }
    

    const duplicate = await this.prisma.offlineRequest.findFirst({
      where: {
        studentId: user.studentId,
        courseId: dto.courseId,
        sessionId: dto.sessionId,
        id: { not: requestId },
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException('An offline request already exists for this session');
    }

    return this.prisma.offlineRequest.update({
      where: { id: requestId },
      data: { courseId: dto.courseId, sessionId: dto.sessionId },
      include: {
        course: { select: { id: true, title: true } },
        session: { select: { id: true, title: true, sessionNumber: true, sessionDate: true, status: true } },
      },
    });
  }

  async remove(user: AuthenticatedUser, requestId: string) {
    if (user.role !== 'STUDENT' || !user.studentId) {
      throw new ForbiddenException('Student access required');
    }

    const request = await this.prisma.offlineRequest.findUnique({
      where: { id: requestId },
      select: { id: true, studentId: true, status: true },
    });

    if (!request || request.studentId !== user.studentId) {
      throw new NotFoundException('Offline request not found');
    }
    if (request.status !== 'PENDING') {
      throw new ConflictException('Only pending requests can be deleted');
    }

    return this.prisma.offlineRequest.delete({ where: { id: requestId } });
  }

  async review(user: AuthenticatedUser, requestId: string, dto: ReviewOfflineRequestDto) {
    this.requireAdmin(user);

    const request = await this.prisma.offlineRequest.findUnique({
      where: { id: requestId },
      select: { id: true, status: true },
    });

    if (!request) throw new NotFoundException('Offline request not found');
    if (request.status !== 'PENDING') {
      throw new ConflictException('Only pending requests can be reviewed');
    }

    if (dto.status === 'APPROVED' && !dto.meetingLink?.trim()) {
      throw new BadRequestException('Meeting link is required when approving a request');
    }

    return this.prisma.offlineRequest.update({
      where: { id: requestId },
      data: {
        status: dto.status,
        meetingLink: dto.status === 'APPROVED' ? dto.meetingLink!.trim() : null,
        reviewedAt: new Date(),
        reviewedBy: user.id,
      },
      include: {
        student: { select: { id: true, fullName: true, nationalId: true } },
        course: { select: { id: true, title: true } },
        session: {
          select: { id: true, title: true, sessionNumber: true, sessionDate: true, status: true },
        },
        reviewer: { select: { id: true, username: true } },
      },
    });
  }
}
