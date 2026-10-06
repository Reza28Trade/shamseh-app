import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationTargetType, NotificationType } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private requireAdmin(user: AuthenticatedUser) {
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'STAFF') {
      throw new ForbiddenException('Admin access required');
    }
  }

  async createNotification(user: AuthenticatedUser, dto: CreateNotificationDto) {
    this.requireAdmin(user);

    if (dto.targetType === NotificationTargetType.GLOBAL && dto.studentIds?.length) {
      throw new BadRequestException('Global notifications cannot specify studentIds');
    }

    if (dto.targetType === NotificationTargetType.COURSE && !dto.courseId) {
      throw new BadRequestException('courseId is required for course notifications');
    }

    if (dto.targetType === NotificationTargetType.STUDENT && (!dto.studentIds || dto.studentIds.length === 0)) {
      throw new BadRequestException('studentIds are required for student notifications');
    }

    if (dto.targetType !== NotificationTargetType.STUDENT && dto.studentIds?.length) {
      throw new BadRequestException('studentIds are only valid for student notifications');
    }

    if (dto.courseId) {
      const course = await this.prisma.course.findUnique({
        where: { id: dto.courseId },
        select: { id: true },
      });
      if (!course) throw new NotFoundException('Course not found');
    }

    if (dto.sessionId) {
      const session = await this.prisma.courseSession.findUnique({
        where: { id: dto.sessionId },
        select: { id: true, courseId: true },
      });
      if (!session) throw new NotFoundException('Session not found');
      if (dto.courseId && session.courseId !== dto.courseId) {
        throw new BadRequestException('Session does not belong to the specified course');
      }
    }

    if (dto.targetType === NotificationTargetType.STUDENT) {
      const studentCount = await this.prisma.student.count({
        where: { id: { in: dto.studentIds } },
      });
      if (studentCount !== new Set(dto.studentIds).size) {
        throw new BadRequestException('One or more students were not found');
      }
    }

    const notification = await this.prisma.notification.create({
      data: {
        title: dto.title,
        content: dto.content,
        type: dto.type,
        targetType: dto.targetType,
        createdById: user.id,
        courseId: dto.courseId,
        sessionId: dto.sessionId,
        students:
          dto.targetType === NotificationTargetType.STUDENT
            ? {
                create: dto.studentIds!.map((studentId) => ({ studentId })),
              }
            : undefined,
      },
      include: {
        students: true,
      },
    });

    return this.publicNotification(notification, null);
  }

  async createStudentNotification(
    createdById: string,
    studentIds: string[],
    title: string,
    content: string,
    type: NotificationType,
  ) {
    const uniqueStudentIds = [...new Set(studentIds)];
    if (!uniqueStudentIds.length) return null;

    const notification = await this.prisma.notification.create({
      data: {
        title,
        content,
        type,
        targetType: NotificationTargetType.STUDENT,
        createdById,
        students: {
          create: uniqueStudentIds.map((studentId) => ({ studentId })),
        },
      },
    });

    return this.publicNotification(notification, null);
  }

  async listForStudent(user: AuthenticatedUser) {
    const studentId = this.requireStudent(user);

    const notifications = await this.prisma.notification.findMany({
      where: {
        OR: [
          { targetType: NotificationTargetType.GLOBAL },
          {
            targetType: NotificationTargetType.COURSE,
            course: {
              enrollments: {
                some: { studentId, status: 'ACTIVE' },
              },
            },
          },
          {
            targetType: NotificationTargetType.STUDENT,
            students: {
              some: { studentId },
            },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        reads: {
          where: { studentId },
          select: { readAt: true },
        },
      },
    });

    return notifications.map((notification) =>
      this.publicNotification(notification, notification.reads[0]?.readAt ?? null),
    );
  }

  async markRead(user: AuthenticatedUser, notificationId: string) {
    const studentId = this.requireStudent(user);

    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        OR: [
          { targetType: NotificationTargetType.GLOBAL },
          {
            targetType: NotificationTargetType.COURSE,
            course: {
              enrollments: {
                some: { studentId, status: 'ACTIVE' },
              },
            },
          },
          {
            targetType: NotificationTargetType.STUDENT,
            students: {
              some: { studentId },
            },
          },
        ],
      },
      select: { id: true },
    });

    if (!notification) throw new NotFoundException('Notification not found');

    const read = await this.prisma.notificationRead.upsert({
      where: {
        notificationId_studentId: { notificationId, studentId },
      },
      create: { notificationId, studentId },
      update: { readAt: new Date() },
    });

    return { notificationId: read.notificationId, readAt: read.readAt };
  }

  private requireStudent(user: AuthenticatedUser) {
    if (user.role !== 'STUDENT' || !user.studentId) {
      throw new ForbiddenException('Student access required');
    }
    return user.studentId;
  }

  private publicNotification(notification: any, readAt: Date | null) {
    return {
      id: notification.id,
      title: notification.title,
      content: notification.content,
      type: notification.type,
      targetType: notification.targetType,
      courseId: notification.courseId,
      sessionId: notification.sessionId,
      createdAt: notification.createdAt,
      readAt,
    };
  }
}
