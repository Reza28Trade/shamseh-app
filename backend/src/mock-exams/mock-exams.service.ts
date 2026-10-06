import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MockExamRegistrationStatus,
  MockExamStatus,
  NotificationType,
} from '@prisma/client';
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
        _count: { select: { registrations: true } },
      },
    });
  }

  async getPublic(mockExamId: string) {
    const exam = await this.prisma.mockExam.findUnique({
      where: { id: mockExamId },
      include: {
        courses: { include: { course: { select: { id: true, title: true } } } },
        _count: { select: { registrations: true } },
      },
    });
    if (!exam || exam.status === MockExamStatus.DRAFT) {
      throw new NotFoundException('Mock exam not found');
    }
    return exam;
  }

  async listForStudent(user: AuthenticatedUser) {
    const studentId = this.requireStudent(user);
    const exams = await this.prisma.mockExam.findMany({
      where: { status: { not: MockExamStatus.DRAFT } },
      orderBy: { examDate: 'asc' },
      include: {
        courses: { include: { course: { select: { id: true, title: true } } } },
        registrations: {
          where: { studentId },
          select: { status: true, registeredAt: true },
        },
      },
    });

    return exams.map((exam) => ({
      ...exam,
      registration: exam.registrations[0] ?? null,
      registrations: undefined,
    }));
  }

  async register(user: AuthenticatedUser, mockExamId: string) {
    const studentId = this.requireStudent(user);
    const exam = await this.prisma.mockExam.findUnique({
      where: { id: mockExamId },
      select: { id: true, status: true, registrationEndsAt: true },
    });
    if (!exam || exam.status === MockExamStatus.DRAFT) {
      throw new NotFoundException('Mock exam not found');
    }
    if (exam.status !== MockExamStatus.OPEN_FOR_REGISTRATION) {
      throw new BadRequestException('Registration is not open for this mock exam');
    }
    if (exam.registrationEndsAt && exam.registrationEndsAt < new Date()) {
      throw new BadRequestException('Registration period has ended');
    }

    const existing = await this.prisma.mockExamRegistration.findUnique({
      where: { mockExamId_studentId: { mockExamId, studentId } },
    });

    if (existing?.status === MockExamRegistrationStatus.ACTIVE) {
      throw new ConflictException('Student is already registered for this mock exam');
    }

    if (existing) {
      return this.prisma.mockExamRegistration.update({
        where: { id: existing.id },
        data: { status: MockExamRegistrationStatus.ACTIVE },
      });
    }

    return this.prisma.mockExamRegistration.create({
      data: { mockExamId, studentId },
    });
  }

  async cancelRegistration(user: AuthenticatedUser, mockExamId: string) {
    const studentId = this.requireStudent(user);
    const registration = await this.prisma.mockExamRegistration.findUnique({
      where: { mockExamId_studentId: { mockExamId, studentId } },
    });
    if (!registration || registration.status !== MockExamRegistrationStatus.ACTIVE) {
      throw new NotFoundException('Mock exam registration not found');
    }

    return this.prisma.mockExamRegistration.update({
      where: { id: registration.id },
      data: { status: MockExamRegistrationStatus.CANCELLED },
    });
  }

  async listForAdmin(user: AuthenticatedUser) {
    this.requireAdmin(user);
    return this.prisma.mockExam.findMany({
      orderBy: { examDate: 'desc' },
      include: {
        courses: { include: { course: { select: { id: true, title: true } } } },
        registrations: {
          where: { status: MockExamRegistrationStatus.ACTIVE },
          include: { student: { select: { id: true, fullName: true, nationalId: true } } },
        },
        _count: { select: { registrations: true } },
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
        registrationStartsAt: dto.registrationStartsAt ? new Date(dto.registrationStartsAt) : undefined,
        registrationEndsAt: dto.registrationEndsAt ? new Date(dto.registrationEndsAt) : undefined,
        examDate: new Date(dto.examDate),
        registrationUrl: dto.registrationUrl,
        examUrl: dto.examUrl,
        status: dto.status ?? MockExamStatus.DRAFT,
        courses: courseIds.length ? { create: courseIds.map((courseId) => ({ courseId })) } : undefined,
      },
      include: { courses: { include: { course: { select: { id: true, title: true } } } } },
    });

    if (exam.registrationUrl && exam.status === MockExamStatus.OPEN_FOR_REGISTRATION && courseIds.length) {
      await this.notifyCourseStudents(
        user.id,
        courseIds,
        exam.title,
        'ثبت‌نام آزمون آزمایشی در سامانه فعال شد. برای مشاهده جزئیات و ثبت‌نام اقدام کنید.',
      );
    }

    return exam;
  }

  async update(user: AuthenticatedUser, mockExamId: string, dto: UpdateMockExamDto) {
    this.requireAdmin(user);
    const courseIds = dto.courseIds === undefined ? undefined : this.uniqueIds(dto.courseIds);
    await this.validateCourseIds(courseIds);

    const existing = await this.prisma.mockExam.findUnique({
      where: { id: mockExamId },
      include: {
        registrations: {
          where: { status: MockExamRegistrationStatus.ACTIVE },
          select: { studentId: true },
        },
        courses: { select: { courseId: true } },
      },
    });
    if (!existing) throw new NotFoundException('Mock exam not found');

    const nextExamDate = dto.examDate ? new Date(dto.examDate) : existing.examDate;
    const nextStatus = dto.status ?? existing.status;
    const nextExamUrl = dto.examUrl !== undefined ? dto.examUrl : existing.examUrl;
    const nextRegistrationUrl = dto.registrationUrl !== undefined ? dto.registrationUrl : existing.registrationUrl;
    const nextCourseIds = courseIds === undefined ? existing.courses.map((course) => course.courseId) : courseIds;

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
          registrationStartsAt:
            dto.registrationStartsAt !== undefined
              ? dto.registrationStartsAt ? new Date(dto.registrationStartsAt) : null
              : undefined,
          registrationEndsAt:
            dto.registrationEndsAt !== undefined
              ? dto.registrationEndsAt ? new Date(dto.registrationEndsAt) : null
              : undefined,
          examDate: dto.examDate ? new Date(dto.examDate) : undefined,
          registrationUrl: dto.registrationUrl,
          examUrl: dto.examUrl,
          status: dto.status,
          courses: courseIds !== undefined ? { create: courseIds.map((courseId) => ({ courseId })) } : undefined,
        },
        include: { courses: { include: { course: { select: { id: true, title: true } } } } },
      });
    });

    const registeredStudentIds = existing.registrations.map((registration) => registration.studentId);
    const dateChanged = nextExamDate.getTime() !== existing.examDate.getTime();
    const linkBecameAvailable =
      (!!nextExamUrl && !existing.examUrl) ||
      (nextStatus === MockExamStatus.LINK_AVAILABLE && existing.status !== MockExamStatus.LINK_AVAILABLE);
    const registrationOpened =
      (!!nextRegistrationUrl && !existing.registrationUrl) ||
      (nextStatus === MockExamStatus.OPEN_FOR_REGISTRATION && existing.status !== MockExamStatus.OPEN_FOR_REGISTRATION);

    if (dateChanged && registeredStudentIds.length) {
      await this.notifications.createStudentNotification(
        user.id,
        registeredStudentIds,
        `زمان آزمون «${updated.title}» تغییر کرد`,
        `زمان برگزاری آزمون به ${nextExamDate.toLocaleString('fa-IR')} تغییر کرده است.`,
        NotificationType.MOCK_EXAM_DATE_CHANGED,
      );
    }

    if (linkBecameAvailable && registeredStudentIds.length) {
      await this.notifications.createStudentNotification(
        user.id,
        registeredStudentIds,
        `لینک آزمون «${updated.title}» فعال شد`,
        'لینک ورود به آزمون آزمایشی در پنل شما قرار گرفت.',
        NotificationType.MOCK_EXAM_LINK_AVAILABLE,
      );
    }

    if (nextStatus === MockExamStatus.CANCELLED && existing.status !== MockExamStatus.CANCELLED && registeredStudentIds.length) {
      await this.notifications.createStudentNotification(
        user.id,
        registeredStudentIds,
        `آزمون «${updated.title}» لغو شد`,
        'اطلاعیه مربوط به لغو آزمون در پنل شما قرار گرفت.',
        NotificationType.MOCK_EXAM,
      );
    }

    if (registrationOpened && nextCourseIds.length) {
      await this.notifyCourseStudents(
        user.id,
        nextCourseIds,
        updated.title,
        'ثبت‌نام آزمون آزمایشی در سامانه فعال شد. برای مشاهده جزئیات و ثبت‌نام اقدام کنید.',
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
    const enrollments = await this.prisma.enrollment.findMany({
      where: { courseId: { in: courseIds }, status: 'ACTIVE' },
      select: { studentId: true },
    });
    const studentIds = [...new Set(enrollments.map((item) => item.studentId))];
    if (!studentIds.length) return;

    await this.notifications.createStudentNotification(
      createdById,
      studentIds,
      `آزمون آزمایشی «${examTitle}»`,
      content,
      NotificationType.MOCK_EXAM,
    );
  }

  private uniqueIds(ids?: string[]) {
    return [...new Set(ids ?? [])];
  }

  private async validateCourseIds(courseIds?: string[]) {
    if (!courseIds?.length) return;
    const count = await this.prisma.course.count({ where: { id: { in: courseIds } } });
    if (count !== courseIds.length) {
      throw new BadRequestException('One or more courses were not found');
    }
  }

  private requireStudent(user: AuthenticatedUser) {
    if (user.role !== 'STUDENT' || !user.studentId) throw new ForbiddenException('Student access required');
    return user.studentId;
  }

  private requireAdmin(user: AuthenticatedUser) {
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'STAFF') throw new ForbiddenException('Admin access required');
  }
}
