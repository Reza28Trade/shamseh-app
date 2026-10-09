import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EnrollmentStatus, PaymentMethod } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { CreatePaymentDto } from './dto/create-payment.dto';

type FinanceStatus = 'PAID' | 'PARTIAL' | 'UNPAID' | 'INCOMPLETE' | 'NO_COURSES';

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  private requireAdmin(user: AuthenticatedUser) {
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'STAFF') {
      throw new ForbiddenException('Admin access required');
    }
  }

  private async getStudentSummary(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        fullName: true,
        nationalId: true,
        phone: true,
        enrollments: {
          where: { status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] } },
          orderBy: { enrolledAt: 'asc' },
          select: {
            id: true,
            status: true,
            enrolledAt: true,
            tuitionAmount: true,
            course: { select: { id: true, title: true, price: true } },
          },
        },
        payments: {
          orderBy: { paidAt: 'desc' },
          select: {
            id: true, amount: true, method: true, reference: true, note: true,
            paidAt: true, createdAt: true,
          },
        },
      },
    });

    if (!student) throw new NotFoundException('Student not found');

    let tuitionTotal = 0;
    let unpricedCourses = 0;
    const enrolledCourses = student.enrollments.map((enrollment) => {
      const effectivePrice = enrollment.tuitionAmount ?? enrollment.course.price;
      if (effectivePrice === null) unpricedCourses += 1;
      else tuitionTotal += Number(effectivePrice);
      return {
        enrollmentId: enrollment.id,
        courseId: enrollment.course.id,
        title: enrollment.course.title,
        status: enrollment.status,
        tuition: effectivePrice === null ? null : Number(effectivePrice),
        enrolledAt: enrollment.enrolledAt,
      };
    });

    const paidTotal = student.payments.reduce((total, payment) => total + Number(payment.amount), 0);
    const balance = Math.max(0, tuitionTotal - paidTotal);
    const status: FinanceStatus = enrolledCourses.length === 0
      ? 'NO_COURSES'
      : unpricedCourses > 0
      ? 'INCOMPLETE'
      : balance <= 0
        ? 'PAID'
        : paidTotal > 0
          ? 'PARTIAL'
          : 'UNPAID';

    return {
      student: { id: student.id, fullName: student.fullName, nationalId: student.nationalId, phone: student.phone },
      enrolledCourses,
      tuitionTotal,
      paidTotal,
      balance,
      credit: Math.max(0, paidTotal - tuitionTotal),
      unpricedCourses,
      status,
      payments: student.payments.map((payment) => ({
        ...payment,
        amount: Number(payment.amount),
      })),
    };
  }

  async listAdminFinance(user: AuthenticatedUser, filters: { search?: string; status?: string; courseId?: string }) {
    this.requireAdmin(user);
    const search = filters.search?.trim();
    const students = await this.prisma.student.findMany({
      where: {
        ...(search ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { nationalId: { contains: search } },
            { phone: { contains: search } },
          ],
        } : {}),
        ...(filters.courseId ? {
          enrollments: {
            some: {
              courseId: filters.courseId,
              status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
            },
          },
        } : {}),
      },
      select: { id: true },
      orderBy: { fullName: 'asc' },
    });

    const summaries = await Promise.all(students.map((student) => this.getStudentSummary(student.id)));
    const rows = summaries
      .filter((summary) => !filters.status || filters.status === 'ALL' || summary.status === filters.status)
      .map((summary) => ({
        ...summary.student,
        courseCount: summary.enrolledCourses.length,
        courseTitles: summary.enrolledCourses.map((course) => course.title),
        tuitionTotal: summary.tuitionTotal,
        paidTotal: summary.paidTotal,
        balance: summary.balance,
        credit: summary.credit,
        unpricedCourses: summary.unpricedCourses,
        status: summary.status,
        payments: summary.payments,
      }));

    return {
      summary: {
        studentCount: rows.length,
        tuitionTotal: rows.reduce((sum, row) => sum + row.tuitionTotal, 0),
        paidTotal: rows.reduce((sum, row) => sum + row.paidTotal, 0),
        outstandingBalance: rows.reduce((sum, row) => sum + row.balance, 0),
        unpaidCount: rows.filter((row) => row.status === 'UNPAID').length,
        partialCount: rows.filter((row) => row.status === 'PARTIAL').length,
        paidCount: rows.filter((row) => row.status === 'PAID').length,
        incompleteCount: rows.filter((row) => row.status === 'INCOMPLETE').length,
        noCourseCount: rows.filter((row) => row.status === 'NO_COURSES').length,
      },
      students: rows,
    };
  }

  async getStudentFinance(user: AuthenticatedUser) {
    if (user.role !== 'STUDENT' || !user.studentId) {
      throw new ForbiddenException('Student access required');
    }
    return this.getStudentSummary(user.studentId);
  }

  async createPayment(user: AuthenticatedUser, studentId: string, dto: CreatePaymentDto) {
    this.requireAdmin(user);
    if (!Number.isFinite(dto.amount) || dto.amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    const summary = await this.getStudentSummary(studentId);
    if (summary.unpricedCourses > 0) {
      throw new BadRequestException('Set a tuition price for every enrolled course before recording a payment');
    }
    if (dto.amount > summary.balance) {
      throw new BadRequestException('Payment amount cannot exceed the remaining balance');
    }

    await this.prisma.payment.create({
      data: {
        studentId,
        amount: dto.amount,
        method: dto.method ?? PaymentMethod.OTHER,
        reference: dto.reference?.trim() || null,
        note: dto.note?.trim() || null,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
        createdById: user.id,
      },
    });

    return this.getStudentSummary(studentId);
  }
}
