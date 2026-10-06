import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MockExamStatus, NotificationType } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateMockExamDto } from './dto/create-mock-exam.dto';
import { UpdateMockExamDto } from './dto/update-mock-exam.dto';

@Injectable()
export class MockExamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async listPublic() {
    return this.prisma.mockExam.findMany({
      where: { status: { not: MockExamStatus.DRAFT } },
      orderBy: { examDate: 'asc' },
      include: {
        courses: { include: { course: { select: { id: true, title: true } } } },
      },
    });
  }

  async getPublic(mockExamId: string) {
    const exam = await this.prisma.mockExam.findUnique({
      where: { id: mockExamId },
      include: {
        courses: { include: { course: { select: { id: true, title: true } } } },
      },
    });
    if (!exam || exam.status === MockExamStatus.DRAFT) {
      throw new NotFoundException('Mock exam not found');
    }
    return exam;
  }

  async listForStudent(user: AuthenticatedUser) {
    this.requireStudent(user);
    return this.prisma.mockExam.findMany({
      where: { status: { not: MockExamStatus.DRAFT } },
      orderBy: { examDate: 'asc' },
      include: {
        courses: { include: { course: { select: { id: true, title: true } } } },
      },
    });
  }

  async listForAdmin(user: AuthenticatedUser) {
    this.requireAdmin(user);
    return this.prisma.mockExam.findMany({
      orderBy: { examDate: 'desc' },
      include: {
        courses: { include: { course: { select: { id: true, title: true } } } },
      },
    });
  }

  async create(user: AuthenticatedUser, dto: CreateMockExamDto) {
    this.requireAdmin(user);
    const courseIds = this.uniqueIds(dto.courseIds);
    await this.validateCourseIds(courseIds);

    const exam = await this.prisma.mockExam.create({
      data: {
        title: dto.title,
        level: dto.level,
        field: dto.field,
        description: dto.description,
        examDate: new Date(dto.examDate),
        examUrl: dto.examUrl,
        status: dto.status ?? MockExamStatus.DRAFT,
        courses: courseIds.length
          ? { create: courseIds.map((courseId) => ({ courseId })) }
          : undefined,
      },
      include: {
        courses: { include: { course: { select: { id: true, title: true } } } },
      },
    });

    if (exam.status !== MockExamStatus.DRAFT && courseIds.length) {
      await this.notifyCourseStudents(
        user.id,
        courseIds,
        exam.title,
        'یک آزمون آزمایشی جدید در Shamseh تعریف شده است. جزئیات و زمان برگزاری را در بخش آزمون‌های آزمایشی ببینید.',
      );
    }

    return exam;
  }

  async update(user: AuthenticatedUser, mockExamId: string, dto: UpdateMockExamDto) {
    this.requireAdmin(user);
    const courseIds =
      dto.courseIds === undefined ? undefined : this.uniqueIds(dto.courseIds);
    await this.validateCourseIds(courseIds);

    const existing = await this.prisma.mockExam.findUnique({
      where: { id: mockExamId },
      include: { courses: { select: { courseId: true } } },
    });
    if (!existing) throw new NotFoundException('Mock exam not found');

    const nextExamDate = dto.examDate ? new Date(dto.examDate) : existing.examDate;
    const nextStatus = dto.status ?? existing.status;
    const nextExamUrl = dto.examUrl !== undefined ? dto.examUrl : existing.examUrl;
    const nextCourseIds =
      courseIds === undefined
        ? existing.courses.map((course) => course.courseId)
        : courseIds;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (courseIds !== undefined) {
        await tx.mockExamCourse.deleteMany({ where: { mockExamId } });
      }

      return tx.mockExam.update({
        where: { id: mockExamId },
        data: {
          title: dto.title,
          level: dto.level,
          field: dto.field,
          description: dto.description,
          examDate: dto.examDate ? new Date(dto.examDate) : undefined,
          examUrl: dto.examUrl,
          status: dto.status,
          courses:
            courseIds !== undefined
              ? { create: courseIds.map((courseId) => ({ courseId })) }
              : undefined,
        },
        include: {
          courses: { include: { course: { select: { id: true, title: true } } } },
        },
      });
    });

    const studentIds = await this.findActiveCourseStudents(nextCourseIds);
    const dateChanged = nextExamDate.getTime() !== existing.examDate.getTime();
    const linkBecameAvailable =
      (!!nextExamUrl && !existing.examUrl) ||
      (nextStatus === MockExamStatus.LINK_AVAILABLE &&
        existing.status !== MockExamStatus.LINK_AVAILABLE);

    if (dateChanged && studentIds.length) {
      await this.notifications.createStudentNotification(
        user.id,
        studentIds,
        `زمان آزمون «${updated.title}» تغییر کرد`,
        `زمان برگزاری آزمون به ${nextExamDate.toLocaleString('fa-IR')} تغییر کرده است.`,
        NotificationType.MOCK_EXAM_DATE_CHANGED,
      );
    }

    if (linkBecameAvailable && studentIds.length) {
      await this.notifications.createStudentNotification(
        user.id,
        studentIds,
        `لینک آزمون «${updated.title}» فعال شد`,
        'لینک ورود به سایت آزمون اکنون در پنل شما قابل مشاهده است.',
        NotificationType.MOCK_EXAM_LINK_AVAILABLE,
      );
    }

    if (
      nextStatus === MockExamStatus.CANCELLED &&
      existing.status !== MockExamStatus.CANCELLED &&
      studentIds.length
    ) {
      await this.notifications.createStudentNotification(
        user.id,
        studentIds,
        `آزمون «${updated.title}» لغو شد`,
        'این آزمون لغو شده است. آخرین وضعیت را در بخش آزمون‌های آزمایشی ببینید.',
        NotificationType.MOCK_EXAM,
      );
    }

    return updated;
  }

  private async notifyCourseStudents(
    createdById: string,
    courseIds: string[],
    examTitle: string,
    content: string,
  ) {
    const studentIds = await this.findActiveCourseStudents(courseIds);
    if (!studentIds.length) return;

    await this.notifications.createStudentNotification(
      createdById,
      studentIds,
      `آزمون آزمایشی «${examTitle}»`,
      content,
      NotificationType.MOCK_EXAM,
    );
  }

  private async findActiveCourseStudents(courseIds: string[]) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { courseId: { in: courseIds }, status: 'ACTIVE' },
      select: { studentId: true },
    });
    return [...new Set(enrollments.map((item) => item.studentId))];
  }

  private uniqueIds(ids?: string[]) {
    return [...new Set(ids ?? [])];
  }

  private async validateCourseIds(courseIds?: string[]) {
    if (!courseIds?.length) return;
    const count = await this.prisma.course.count({
      where: { id: { in: courseIds } },
    });
    if (count !== courseIds.length) {
      throw new BadRequestException('One or more courses were not found');
    }
  }

  private requireStudent(user: AuthenticatedUser) {
    if (user.role !== 'STUDENT' || !user.studentId) {
      throw new ForbiddenException('Student access required');
    }
  }

  private requireAdmin(user: AuthenticatedUser) {
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'STAFF') {
      throw new ForbiddenException('Admin access required');
    }
  }
}
