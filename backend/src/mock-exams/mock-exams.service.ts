import {
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
    });
  }

  async getPublic(mockExamId: string) {
    const exam = await this.prisma.mockExam.findUnique({
      where: { id: mockExamId },
    });

    if (!exam || exam.status === MockExamStatus.DRAFT) {
      throw new NotFoundException('Mock exam not found');
    }

    return exam;
  }

  async listForStudent(user: AuthenticatedUser) {
    this.requireStudent(user);

    return this.prisma.mockExam.findMany({
      where: {
        status: { not: MockExamStatus.DRAFT },
        participants: {
          some: { studentId: user.studentId! },
        },
      },
      orderBy: { examDate: 'asc' },
    });
  }

  async listForAdmin(user: AuthenticatedUser) {
    this.requireAdmin(user);

    return this.prisma.mockExam.findMany({
      orderBy: { examDate: 'desc' },
      include: {
        participants: {
          include: {
            student: {
              select: { id: true, fullName: true, nationalId: true },
            },
          },
        },
      },
    });
  }

  async create(user: AuthenticatedUser, dto: CreateMockExamDto) {
    this.requireAdmin(user);

    return this.prisma.mockExam.create({
      data: {
        title: dto.title,
        level: dto.level,
        field: dto.field,
        examDate: new Date(dto.examDate),
        examUrl: dto.examUrl,
        status: dto.status ?? MockExamStatus.DRAFT,
      },
    });
  }

  async update(
    user: AuthenticatedUser,
    mockExamId: string,
    dto: UpdateMockExamDto,
  ) {
    this.requireAdmin(user);

    const existing = await this.prisma.mockExam.findUnique({
      where: { id: mockExamId },
      include: { participants: { select: { studentId: true } } },
    });

    if (!existing) {
      throw new NotFoundException('Mock exam not found');
    }

    const updated = await this.prisma.mockExam.update({
      where: { id: mockExamId },
      data: {
        title: dto.title,
        level: dto.level,
        field: dto.field,
        examDate: dto.examDate ? new Date(dto.examDate) : undefined,
        examUrl: dto.examUrl,
        status: dto.status,
      },
      include: {
        participants: {
          include: {
            student: {
              select: { id: true, fullName: true, nationalId: true },
            },
          },
        },
      },
    });

    const studentIds = existing.participants.map((item) => item.studentId);
    const nextExamDate = dto.examDate
      ? new Date(dto.examDate)
      : existing.examDate;
    const nextStatus = dto.status ?? existing.status;
    const nextExamUrl =
      dto.examUrl !== undefined ? dto.examUrl : existing.examUrl;

    const dateChanged =
      nextExamDate.getTime() !== existing.examDate.getTime();
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

  async listParticipants(
    user: AuthenticatedUser,
    mockExamId: string,
  ) {
    this.requireAdmin(user);
    await this.ensureExam(mockExamId);

    return this.prisma.mockExamParticipant.findMany({
      where: { mockExamId },
      orderBy: { createdAt: 'asc' },
      include: {
        student: {
          select: { id: true, fullName: true, nationalId: true },
        },
      },
    });
  }

  async addParticipant(
    user: AuthenticatedUser,
    mockExamId: string,
    studentId: string,
  ) {
    this.requireAdmin(user);
    await this.ensureExam(mockExamId);

    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, fullName: true, nationalId: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return this.prisma.mockExamParticipant.upsert({
      where: {
        mockExamId_studentId: { mockExamId, studentId },
      },
      create: { mockExamId, studentId },
      update: {},
      include: {
        student: {
          select: { id: true, fullName: true, nationalId: true },
        },
      },
    });
  }

  async removeParticipant(
    user: AuthenticatedUser,
    mockExamId: string,
    studentId: string,
  ) {
    this.requireAdmin(user);

    return this.prisma.mockExamParticipant.delete({
      where: {
        mockExamId_studentId: { mockExamId, studentId },
      },
    });
  }

  private async ensureExam(mockExamId: string) {
    const exam = await this.prisma.mockExam.findUnique({
      where: { id: mockExamId },
      select: { id: true },
    });

    if (!exam) {
      throw new NotFoundException('Mock exam not found');
    }

    return exam;
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
