import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import * as argon2 from 'argon2';
import {
  EnrollmentStatus, RegistrationApprovalMode, RegistrationStatus, RegistrationPaymentPurpose,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { ReviewRegistrationDto } from './dto/review-registration.dto';
import { SubmitInstallmentPaymentDto } from './dto/submit-installment-payment.dto';
import { ReviewInstallmentPaymentDto } from './dto/review-installment-payment.dto';
import { CreateRefundRequestDto } from './dto/create-refund-request.dto';
import { MarkRefundPaidDto } from './dto/mark-refund-paid.dto';

const RECEIPT_DIR = process.env.REGISTRATION_RECEIPT_STORAGE_PATH
  || join(process.env.FILE_STORAGE_PATH || '/opt/shamseh-app/storage/files', 'registration-receipts');
const ALLOWED_RECEIPT_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

@Injectable()
export class RegistrationsService implements OnModuleInit, OnModuleDestroy {
  private reminderTimer: ReturnType<typeof setInterval> | null = null;
  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    void this.sendDueInstallmentReminders();
    this.reminderTimer = setInterval(() => void this.sendDueInstallmentReminders(), 6 * 60 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.reminderTimer) clearInterval(this.reminderTimer);
  }

  private async sendDueInstallmentReminders() {
    try {
      const now = new Date();
      const threeDaysAhead = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const threeDaysMinusSixHours = new Date(now.getTime() + 66 * 60 * 60 * 1000);
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const creator = await this.prisma.user.findFirst({
        where: { role: 'SUPER_ADMIN', status: 'ACTIVE' }, select: { id: true },
      });
      if (!creator) return;

      await this.prisma.installment.updateMany({
        where: { status: { not: 'PAID' }, dueDate: { lt: now }, registration: { status: 'APPROVED', studentId: { not: null } } },
        data: { status: 'OVERDUE' },
      });

      const [dueSoon, overdue] = await Promise.all([
        this.prisma.installment.findMany({
          where: {
            status: { not: 'PAID' }, dueDate: { gt: threeDaysMinusSixHours, lte: threeDaysAhead },
            lastReminderAt: null,
            registration: { status: 'APPROVED', studentId: { not: null } },
          },
          select: { id: true, dueDate: true, amount: true, registrationId: true, lastReminderAt: true, registration: { select: { studentId: true } } },
        }),
        this.prisma.installment.findMany({
          where: {
            status: { not: 'PAID' }, dueDate: { lt: now },
            OR: [{ lastReminderAt: null }, { lastReminderAt: { lte: threeDaysAgo } }],
            registration: { status: 'APPROVED', studentId: { not: null } },
          },
          select: { id: true, dueDate: true, amount: true, registrationId: true, lastReminderAt: true, registration: { select: { studentId: true } } },
        }),
      ]);

      for (const item of [...dueSoon.map((x) => ({ ...x, kind: 'DUE_SOON' as const })), ...overdue.map((x) => ({ ...x, kind: 'OVERDUE' as const }))]) {
        if (!item.registration.studentId) continue;
        await this.prisma.$transaction(async (tx) => {
          const claimed = await tx.installment.updateMany({
            where: { id: item.id, status: { not: 'PAID' }, lastReminderAt: item.lastReminderAt },
            data: { lastReminderAt: now, lastReminderType: item.kind, ...(item.kind === 'OVERDUE' ? { status: 'OVERDUE' as const } : {}) },
          });
          if (claimed.count !== 1) return;
          await tx.notification.create({
            data: {
              title: item.kind === 'DUE_SOON' ? 'یادآوری سررسید قسط' : 'یادآوری قسط سررسیدگذشته',
              content: item.kind === 'DUE_SOON'
                ? `قسط شما در تاریخ ${item.dueDate.toLocaleDateString('fa-IR')} سررسید می‌شود. اگر رسید پرداخت را ارسال کرده‌اید، تا تأیید مدیریت وضعیت قسط همچنان باز است.`
                : `قسط سررسیدشده شما مربوط به تاریخ ${item.dueDate.toLocaleDateString('fa-IR')} هنوز تسویه نشده است. یادآوری هر سه روز تا تأیید پرداخت ادامه خواهد داشت.`,
              type: 'IMPORTANT',
              targetType: 'STUDENT',
              createdById: creator.id,
              students: { create: { studentId: item.registration.studentId! } },
            },
          });
        });
      }
    } catch (error) {
      // Keep the application alive; the next scheduled run retries safely.
      console.error('[RegistrationFinance] installment reminder run failed', error);
    }
  }

  async listPublicCourses() {
    return this.prisma.course.findMany({
      where: { status: 'ACTIVE', price: { not: null } },
      select: { id: true, title: true, professor: true, level: true, price: true, coverImage: true },
      orderBy: [{ academicYear: 'desc' }, { title: 'asc' }],
    }).then((courses) => courses.map((course) => ({ ...course, price: Number(course.price) })));
  }

  async createPublicRegistration(dto: CreateRegistrationDto, file: any) {
    const courseIds = this.parseCourseIds(dto.courseIds);
    this.validateReceipt(file);
    const nationalId = dto.nationalId.trim();
    const phone = dto.phone.trim();
    const existingStudent = await this.prisma.student.findUnique({
      where: { nationalId },
      select: { id: true, fullName: true, phone: true, academicLevel: true, fieldCode: true },
    });
    if (existingStudent?.phone && existingStudent.phone !== phone) {
      throw new ConflictException('شماره موبایل این هنرجو فقط توسط مدیریت قابل تغییر است.');
    }
    const openRegistration = await this.prisma.registration.findFirst({
      where: { nationalId, status: { in: ['PENDING_REVIEW', 'NEEDS_CORRECTION'] } },
      select: { id: true },
    });
    if (openRegistration) {
      throw new ConflictException('برای این کد ملی یک ثبت‌نام در انتظار بررسی وجود دارد.');
    }

    const courses = await this.prisma.course.findMany({
      where: { id: { in: courseIds }, status: 'ACTIVE', price: { not: null } },
      select: { id: true, title: true, price: true },
    });
    if (courses.length !== courseIds.length) {
      throw new BadRequestException('یک یا چند دوره انتخاب‌شده فعال نیست یا قیمت ندارد.');
    }
    const originalTuition = courses.reduce((sum, course) => sum + Number(course.price), 0);
    if (!Number.isFinite(originalTuition) || originalTuition <= 0) throw new BadRequestException('شهریه دوره‌های انتخاب‌شده باید بیشتر از صفر باشد.');
    if (!Number.isFinite(dto.claimedAmount) || dto.claimedAmount <= 0) {
      throw new BadRequestException('مبلغ رسید باید بیشتر از صفر باشد.');
    }

    const storageKey = await this.storeReceipt(file);
    try {
      const registration = await this.prisma.$transaction(async (tx) => {
        const created = await tx.registration.create({
          data: {
            applicantFullName: existingStudent?.fullName ?? dto.applicantFullName.trim(),
            nationalId,
            phone: existingStudent?.phone ?? phone,
            academicLevel: existingStudent?.academicLevel ?? dto.academicLevel,
            fieldCode: existingStudent?.fieldCode ?? dto.fieldCode.trim(),
            studentId: existingStudent?.id,
            originalTuition,
            finalTuition: originalTuition,
            courses: {
              create: courses.map((course) => ({
                courseId: course.id,
                courseTitleSnapshot: course.title,
                coursePriceSnapshot: Number(course.price),
              })),
            },
          },
          select: { id: true, status: true, originalTuition: true, finalTuition: true },
        });
        const payment = await tx.registrationPayment.create({
          data: {
            registrationId: created.id,
            purpose: RegistrationPaymentPurpose.INITIAL,
            claimedAmount: dto.claimedAmount,
            paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
            trackingCode: dto.trackingCode?.trim() || null,
            receipts: {
              create: {
                storageKey,
                mimeType: file.mimetype,
                fileSize: BigInt(file.size),
              },
            },
          },
          select: { id: true },
        });
        await tx.registrationReviewHistory.create({
          data: {
            registrationId: created.id,
            action: 'SUBMITTED',
            toStatus: RegistrationStatus.PENDING_REVIEW,
            metadata: { paymentId: payment.id, courseIds, claimedAmount: dto.claimedAmount },
          },
        });
        return { ...created, paymentId: payment.id };
      });
      return { ...registration, message: 'درخواست ثبت‌نام با موفقیت ثبت شد. اطلاعات ورود پس از تأیید مدیریت ایجاد می‌شود.' };
    } catch (error) {
      await unlink(join(RECEIPT_DIR, storageKey)).catch(() => undefined);
      throw error;
    }
  }

  async getPublicRegistrationStatus(registrationId: string, nationalId: string, phone: string) {
    const registration = await this.prisma.registration.findFirst({
      where: {
        id: registrationId,
        nationalId: nationalId?.trim(),
        phone: phone?.trim(),
      },
      include: {
        courses: { select: { courseTitleSnapshot: true, coursePriceSnapshot: true } },
        payments: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, purpose: true, status: true, claimedAmount: true, approvedAmount: true, rejectionReason: true, createdAt: true },
        },
      },
    });
    if (!registration) throw new NotFoundException('ثبت‌نامی با این مشخصات پیدا نشد.');
    return {
      id: registration.id,
      status: registration.status,
      reviewNote: registration.reviewNote,
      applicantFullName: registration.applicantFullName,
      originalTuition: Number(registration.originalTuition),
      discountAmount: Number(registration.discountAmount),
      finalTuition: Number(registration.finalTuition),
      courses: registration.courses.map((course) => ({ ...course, coursePriceSnapshot: Number(course.coursePriceSnapshot) })),
      payments: registration.payments.map((payment) => ({
        ...payment, claimedAmount: Number(payment.claimedAmount),
        approvedAmount: payment.approvedAmount === null ? null : Number(payment.approvedAmount),
      })),
    };
  }

  async uploadCorrectionReceipt(registrationId: string, body: { nationalId: string; phone: string; claimedAmount: number; paymentDate?: string; trackingCode?: string }, file: any) {
    this.validateReceipt(file);
    if (!Number.isFinite(Number(body.claimedAmount)) || Number(body.claimedAmount) <= 0) {
      throw new BadRequestException('مبلغ پرداخت باید بیشتر از صفر باشد.');
    }
    const registration = await this.prisma.registration.findUnique({
      where: { id: registrationId }, select: { id: true, status: true, originalTuition: true, nationalId: true, phone: true },
    });
    if (!registration || registration.status !== 'NEEDS_CORRECTION'
      || registration.nationalId !== body.nationalId?.trim()
      || registration.phone !== body.phone?.trim()) {
      throw new NotFoundException('ثبت‌نامی با این مشخصات برای اصلاح رسید پیدا نشد.');
    }
    const storageKey = await this.storeReceipt(file);
    try {
      const payment = await this.prisma.$transaction(async (tx) => {
        const created = await tx.registrationPayment.create({
          data: {
            registrationId,
            purpose: RegistrationPaymentPurpose.INITIAL,
            claimedAmount: Number(body.claimedAmount),
            paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
            trackingCode: body.trackingCode?.trim() || null,
            receipts: { create: { storageKey, mimeType: file.mimetype, fileSize: BigInt(file.size) } },
          },
          select: { id: true, claimedAmount: true, status: true },
        });
        await tx.registration.update({ where: { id: registrationId }, data: { status: 'PENDING_REVIEW' } });
        await tx.registrationReviewHistory.create({
          data: {
            registrationId, action: 'CORRECTION_RECEIPT_SUBMITTED',
            fromStatus: registration.status, toStatus: 'PENDING_REVIEW',
            metadata: { paymentId: created.id, claimedAmount: Number(body.claimedAmount) },
          },
        });
        return created;
      });
      return payment;
    } catch (error) {
      await unlink(join(RECEIPT_DIR, storageKey)).catch(() => undefined);
      throw error;
    }
  }

  async listAdminRegistrations(actor: AuthenticatedUser, status?: string) {
    this.requireFinanceAccess(actor);
    const allowed = ['PENDING_REVIEW', 'NEEDS_CORRECTION', 'APPROVED', 'REJECTED'];
    if (status && status !== 'ALL' && !allowed.includes(status)) throw new BadRequestException('Invalid registration status');
    return this.prisma.registration.findMany({
      where: status && status !== 'ALL' ? { status: status as RegistrationStatus } : undefined,
      include: {
        courses: { select: { id: true, courseTitleSnapshot: true, coursePriceSnapshot: true } },
        payments: {
          orderBy: { createdAt: 'desc' },
          include: { receipts: { orderBy: { uploadedAt: 'desc' }, select: { id: true, mimeType: true, fileSize: true, uploadedAt: true } } },
        },
        reviewHistory: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
      orderBy: { createdAt: 'asc' },
    }).then((rows) => rows.map((row) => ({
      ...row,
      originalTuition: Number(row.originalTuition),
      discountAmount: Number(row.discountAmount),
      finalTuition: Number(row.finalTuition),
      courses: row.courses.map((course) => ({ ...course, coursePriceSnapshot: Number(course.coursePriceSnapshot) })),
      payments: row.payments.map((payment) => ({
        ...payment,
        claimedAmount: Number(payment.claimedAmount),
        approvedAmount: payment.approvedAmount === null ? null : Number(payment.approvedAmount),
      })),
    })));
  }

  async viewReceipt(actor: AuthenticatedUser, receiptId: string) {
    this.requireFinanceAccess(actor);
    const receipt = await this.prisma.registrationPaymentReceipt.findUnique({
      where: { id: receiptId },
      select: { storageKey: true, mimeType: true },
    });
    if (!receipt) throw new NotFoundException('رسید پیدا نشد.');
    return { path: join(RECEIPT_DIR, receipt.storageKey), mimeType: receipt.mimeType };
  }

  async reviewAndApprove(actor: AuthenticatedUser, registrationId: string, dto: ReviewRegistrationDto) {
    this.requireFinanceAccess(actor);
    const registration = await this.prisma.registration.findUnique({
      where: { id: registrationId },
      include: { courses: true, payments: { where: { status: 'APPROVED', purpose: 'INITIAL' } } },
    });
    if (!registration) throw new NotFoundException('ثبت‌نام پیدا نشد.');
    if (!['PENDING_REVIEW', 'NEEDS_CORRECTION'].includes(registration.status)) {
      throw new ConflictException('این ثبت‌نام قبلاً بررسی نهایی شده است.');
    }
    const payment = await this.prisma.registrationPayment.findFirst({
      where: { id: dto.paymentId, registrationId, purpose: 'INITIAL', status: 'PENDING' },
      include: { receipts: true },
    });
    if (!payment || payment.receipts.length === 0) throw new BadRequestException('پرداخت در انتظار بررسی با رسید معتبر پیدا نشد.');
    const discount = Number(dto.discountAmount);
    if (!Number.isFinite(discount) || discount < 0 || discount > Number(registration.originalTuition)) {
      throw new BadRequestException('مبلغ تخفیف معتبر نیست.');
    }
    if (dto.mode === RegistrationApprovalMode.NORMAL && (discount !== 0 || !Number.isFinite(dto.approvedAmount))) {
      throw new BadRequestException('در حالت عادی تخفیف مجاز نیست.');
    }
    if (dto.mode === RegistrationApprovalMode.DISCOUNT && (discount <= 0 || !dto.discountReason?.trim())) {
      throw new BadRequestException('برای حالت تخفیف، مبلغ و علت تخفیف الزامی است.');
    }
    if (dto.mode === RegistrationApprovalMode.PAYMENT_EXCEPTION) {
      if (discount !== 0 || !dto.exceptionReason?.trim()) throw new BadRequestException('استثنای پرداخت بدون تخفیف و با علت مستند مجاز است.');
      if (actor.role !== 'SUPER_ADMIN') throw new ForbiddenException('تأیید استثنای پرداخت فقط با مجوز مدیر ارشد انجام می‌شود.');
    }
    const finalTuition = Number(registration.originalTuition) - discount;
    if (!Number.isFinite(finalTuition) || finalTuition <= 0) throw new BadRequestException('شهریه نهایی باید بیشتر از صفر باشد.');
    const otherApproved = registration.payments.reduce((sum, p) => sum + Number(p.approvedAmount ?? 0), 0);
    const totalPaid = otherApproved + Number(dto.approvedAmount);
    if (!Number.isFinite(totalPaid) || totalPaid <= 0) throw new BadRequestException('مبلغ تأییدشده معتبر نیست.');
    const ratio = totalPaid / finalTuition;
    if (dto.mode === RegistrationApprovalMode.NORMAL && ratio < 0.6) throw new BadRequestException('پیش‌پرداخت در حالت عادی باید حداقل ۶۰٪ باشد.');
    if (dto.mode === RegistrationApprovalMode.DISCOUNT && ratio < 0.6) throw new BadRequestException('پس از تخفیف نیز پیش‌پرداخت باید حداقل ۶۰٪ شهریه نهایی باشد.');
    if (dto.mode === RegistrationApprovalMode.PAYMENT_EXCEPTION && ratio >= 0.6) throw new BadRequestException('حالت استثنا فقط برای پرداخت کمتر از ۶۰٪ است.');
    const firstDueDate = new Date(dto.firstDueDate);
    if (Number.isNaN(firstDueDate.getTime())) throw new BadRequestException('تاریخ سررسید معتبر نیست.');
    if (totalPaid < finalTuition && firstDueDate.getTime() < Date.now()) throw new BadRequestException('تاریخ اولین قسط نباید در گذشته باشد.');

    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.registrationPayment.updateMany({
        where: { id: payment.id, status: 'PENDING' },
        data: {
          status: 'APPROVED', approvedAmount: dto.approvedAmount,
          reviewedById: actor.id, reviewedAt: new Date(),
          reviewNote: dto.reviewNote?.trim() || null,
        },
      });
      if (claimed.count !== 1) throw new ConflictException('این پرداخت هم‌زمان توسط کاربر دیگری بررسی شده است.');

      let student = registration.studentId
        ? await tx.student.findUnique({ where: { id: registration.studentId }, include: { user: true } })
        : await tx.student.findUnique({ where: { nationalId: registration.nationalId }, include: { user: true } });
      if (!student) {
        const usernameTaken = await tx.user.findUnique({ where: { username: registration.nationalId }, select: { id: true } });
        if (usernameTaken) throw new ConflictException('کد ملی قبلاً به عنوان نام کاربری استفاده شده است؛ حساب باید دستی بررسی شود.');
        const user = await tx.user.create({
          data: {
            username: registration.nationalId,
            passwordHash: await argon2.hash(registration.phone),
            role: 'STUDENT',
          },
        });
        student = await tx.student.create({
          data: {
            userId: user.id,
            fullName: registration.applicantFullName,
            nationalId: registration.nationalId,
            phone: registration.phone,
            academicLevel: registration.academicLevel,
            fieldCode: registration.fieldCode,
            freeMockExamEligible: dto.mockExamEligible ?? false,
          },
          include: { user: true },
        });
      } else {
        // Existing student profile fields can only be filled when missing, during this management approval.
        if (!student.fieldCode && registration.fieldCode) {
          await tx.studentProfileHistory.create({
            data: { studentId: student.id, changedById: actor.id, fieldName: 'fieldCode', oldValue: null, newValue: registration.fieldCode, reason: 'Set during registration approval' },
          });
          await tx.student.update({ where: { id: student.id }, data: { fieldCode: registration.fieldCode } });
        }
        if (!student.phone && registration.phone) {
          await tx.studentProfileHistory.create({
            data: { studentId: student.id, changedById: actor.id, fieldName: 'phone', oldValue: null, newValue: registration.phone, reason: 'Set during registration approval' },
          });
          await tx.student.update({ where: { id: student.id }, data: { phone: registration.phone } });
        }
      }
      if (dto.mockExamEligible) {
        await tx.student.update({ where: { id: student.id }, data: { freeMockExamEligible: true } });
      }

      await tx.registrationCourse.findMany({ where: { registrationId }, select: { courseId: true } }).then(async (items) => {
        for (const item of items) {
          const existing = await tx.enrollment.findUnique({
            where: { studentId_courseId: { studentId: student!.id, courseId: item.courseId } },
            select: { id: true },
          });
          if (!existing) {
            const snapshot = registration.courses.find((c) => c.courseId === item.courseId);
            await tx.enrollment.create({
              data: {
                studentId: student!.id, courseId: item.courseId,
                status: EnrollmentStatus.ACTIVE,
                tuitionAmount: snapshot?.coursePriceSnapshot,
              },
            });
          }
        }
      });

      // Any amount above this registration's final tuition is applied to the student's oldest unpaid installments first.
      let excess = Math.max(0, totalPaid - finalTuition);
      if (excess > 0) {
        const olderInstallments = await tx.installment.findMany({
          where: {
            registration: { studentId: student.id, status: 'APPROVED' },
            registrationId: { not: registrationId },
          },
          include: { allocations: { select: { amount: true } } },
          orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
        });
        for (const item of olderInstallments) {
          if (excess <= 0.0001) break;
          const alreadyAllocated = item.allocations.reduce((sum, allocation) => sum + Number(allocation.amount), 0);
          const due = Number(item.amount) - alreadyAllocated;
          if (due <= 0.0001) continue;
          const amount = Math.min(excess, due);
          await tx.paymentAllocation.create({ data: { paymentId: payment.id, installmentId: item.id, amount } });
          const paidAfter = alreadyAllocated + amount;
          await tx.installment.update({
            where: { id: item.id },
            data: { status: paidAfter + 0.0001 >= Number(item.amount) ? 'PAID' : 'PARTIALLY_PAID' },
          });
          excess = Math.round((excess - amount) * 100) / 100;
        }
      }

      const remaining = Math.max(0, finalTuition - totalPaid);
      const installments = remaining === 0 ? 0 : ratio >= 0.8 ? 1 : 2;
      if (installments > 0) {
        const amounts = installments === 1 ? [remaining] : [Math.floor((remaining / 2) * 100) / 100, remaining - Math.floor((remaining / 2) * 100) / 100];
        await tx.installment.createMany({
          data: amounts.map((amount, index) => ({
            registrationId, sequence: index + 1, amount,
            dueDate: index === 0 ? firstDueDate : this.addOneMonthClamped(firstDueDate),
          })),
        });
      }
      await tx.registration.update({
        where: { id: registrationId },
        data: {
          studentId: student.id, status: 'APPROVED', approvalMode: dto.mode,
          discountAmount: discount, finalTuition,
          discountReason: dto.mode === 'DISCOUNT' ? dto.discountReason!.trim() : null,
          exceptionReason: dto.mode === 'PAYMENT_EXCEPTION' ? dto.exceptionReason!.trim() : null,
          mockExamEligible: dto.mockExamEligible ?? false,
          reviewedById: actor.id, reviewedAt: new Date(), approvedAt: new Date(),
          reviewNote: dto.reviewNote?.trim() || null,
        },
      });
      await tx.registrationReviewHistory.create({
        data: {
          registrationId, actorUserId: actor.id, action: 'APPROVED',
          fromStatus: registration.status, toStatus: 'APPROVED',
          note: dto.reviewNote?.trim() || null,
          metadata: {
            mode: dto.mode, originalTuition: Number(registration.originalTuition),
            discountAmount: discount, finalTuition, approvedPayment: Number(dto.approvedAmount),
            firstDueDate: firstDueDate.toISOString(), installmentCount: installments,
            mockExamEligible: dto.mockExamEligible ?? false,
          },
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: actor.id, action: 'REGISTRATION_APPROVED',
          entityType: 'Registration', entityId: registrationId,
          metadata: {
            mode: dto.mode, discountAmount: discount, finalTuition,
            approvedPayment: Number(dto.approvedAmount), studentId: student.id,
          },
        },
      });
      return { success: true, registrationId, studentId: student.id, studentUsername: student.user.username, finalTuition, remaining, installmentCount: installments };
    });
  }

  async requestCorrection(actor: AuthenticatedUser, registrationId: string, note: string) {
    this.requireFinanceAccess(actor);
    if (!note?.trim()) throw new BadRequestException('علت درخواست اصلاح الزامی است.');
    return this.prisma.$transaction(async (tx) => {
      const registration = await tx.registration.findUnique({ where: { id: registrationId }, select: { id: true, status: true } });
      if (!registration || !['PENDING_REVIEW', 'NEEDS_CORRECTION'].includes(registration.status)) throw new NotFoundException('ثبت‌نام قابل اصلاح پیدا نشد.');
      await tx.registrationPayment.updateMany({
        where: { registrationId, purpose: 'INITIAL', status: 'PENDING' },
        data: { status: 'REJECTED', rejectionReason: note.trim(), reviewedById: actor.id, reviewedAt: new Date() },
      });
      await tx.registration.update({ where: { id: registrationId }, data: { status: 'NEEDS_CORRECTION', reviewedById: actor.id, reviewedAt: new Date(), reviewNote: note.trim() } });
      await tx.registrationReviewHistory.create({
        data: { registrationId, actorUserId: actor.id, action: 'NEEDS_CORRECTION', fromStatus: registration.status, toStatus: 'NEEDS_CORRECTION', note: note.trim() },
      });
      await tx.auditLog.create({ data: { actorUserId: actor.id, action: 'REGISTRATION_NEEDS_CORRECTION', entityType: 'Registration', entityId: registrationId, metadata: { note: note.trim() } } });
      return { success: true, status: 'NEEDS_CORRECTION' };
    });
  }

  async rejectRegistration(actor: AuthenticatedUser, registrationId: string, reason: string) {
    this.requireFinanceAccess(actor);
    if (!reason?.trim()) throw new BadRequestException('علت رد ثبت‌نام الزامی است.');
    return this.prisma.$transaction(async (tx) => {
      const registration = await tx.registration.findUnique({ where: { id: registrationId }, select: { id: true, status: true } });
      if (!registration || !['PENDING_REVIEW', 'NEEDS_CORRECTION'].includes(registration.status)) throw new NotFoundException('ثبت‌نام قابل رد پیدا نشد.');
      await tx.registrationPayment.updateMany({
        where: { registrationId, status: 'PENDING' },
        data: { status: 'REJECTED', rejectionReason: reason.trim(), reviewedById: actor.id, reviewedAt: new Date() },
      });
      await tx.registration.update({ where: { id: registrationId }, data: { status: 'REJECTED', reviewedById: actor.id, reviewedAt: new Date(), reviewNote: reason.trim() } });
      await tx.registrationReviewHistory.create({
        data: { registrationId, actorUserId: actor.id, action: 'REJECTED', fromStatus: registration.status, toStatus: 'REJECTED', note: reason.trim() },
      });
      await tx.auditLog.create({ data: { actorUserId: actor.id, action: 'REGISTRATION_REJECTED', entityType: 'Registration', entityId: registrationId, metadata: { reason: reason.trim() } } });
      return { success: true, status: 'REJECTED' };
    });
  }

  async submitInstallmentPayment(actor: AuthenticatedUser, installmentId: string, dto: SubmitInstallmentPaymentDto, file: any) {
    if (actor.role !== 'STUDENT' || !actor.studentId) throw new ForbiddenException('Student access required');
    this.validateReceipt(file);
    if (!Number.isFinite(dto.claimedAmount) || dto.claimedAmount <= 0) throw new BadRequestException('مبلغ پرداخت باید بیشتر از صفر باشد.');
    const installment = await this.prisma.installment.findUnique({
      where: { id: installmentId },
      include: {
        registration: { select: { id: true, studentId: true, status: true } },
        allocations: { select: { amount: true } },
      },
    });
    if (!installment || installment.registration.studentId !== actor.studentId || installment.registration.status !== 'APPROVED') {
      throw new NotFoundException('قسط متعلق به حساب شما پیدا نشد.');
    }
    const installmentPaid = installment.allocations.reduce((sum, allocation) => sum + Number(allocation.amount), 0);
    if (Number(installment.amount) - installmentPaid <= 0.0001) {
      throw new ConflictException('این قسط قبلاً تسویه شده است.');
    }
    const storageKey = await this.storeReceipt(file);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const registrations = await tx.registration.findMany({
          where: { studentId: actor.studentId!, status: 'APPROVED' },
          select: { id: true, installments: { include: { allocations: { select: { amount: true } } } } },
        });
        const outstanding = registrations.flatMap((registration) => registration.installments.map((item) => ({
          id: item.id,
          amount: Number(item.amount),
          allocated: item.allocations.reduce((sum, allocation) => sum + Number(allocation.amount), 0),
        }))).reduce((sum, item) => sum + Math.max(0, item.amount - item.allocated), 0);
        const pending = await tx.registrationPayment.findMany({
          where: { registrationId: { in: registrations.map((item) => item.id) }, purpose: 'INSTALLMENT', status: 'PENDING' },
          select: { claimedAmount: true },
        });
        const pendingTotal = pending.reduce((sum, item) => sum + Number(item.claimedAmount), 0);
        if (dto.claimedAmount > outstanding - pendingTotal + 0.0001) {
          throw new BadRequestException('مبلغ رسید از بدهی باقی‌مانده بیشتر است؛ پرداخت‌های در انتظار بررسی نیز محاسبه شده‌اند.');
        }
        const payment = await tx.registrationPayment.create({
          data: {
            registrationId: installment.registration.id,
            purpose: RegistrationPaymentPurpose.INSTALLMENT,
            claimedAmount: dto.claimedAmount,
            paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
            trackingCode: dto.trackingCode?.trim() || null,
            receipts: { create: { storageKey, mimeType: file.mimetype, fileSize: BigInt(file.size), uploaderUserId: actor.id } },
          },
          select: { id: true, registrationId: true, status: true, claimedAmount: true },
        });
        await tx.registrationReviewHistory.create({
          data: {
            registrationId: installment.registration.id, actorUserId: actor.id,
            action: 'INSTALLMENT_PAYMENT_SUBMITTED',
            metadata: { paymentId: payment.id, installmentId, claimedAmount: dto.claimedAmount },
          },
        });
        return payment;
      }, { isolationLevel: 'Serializable' });
    } catch (error) {
      await unlink(join(RECEIPT_DIR, storageKey)).catch(() => undefined);
      throw error;
    }
  }

  async reviewInstallmentPayment(actor: AuthenticatedUser, paymentId: string, dto: ReviewInstallmentPaymentDto) {
    this.requireFinanceAccess(actor);
    const payment = await this.prisma.registrationPayment.findUnique({
      where: { id: paymentId },
      include: { registration: { select: { id: true, studentId: true, status: true } }, receipts: true },
    });
    if (!payment || payment.purpose !== RegistrationPaymentPurpose.INSTALLMENT || payment.status !== 'PENDING') {
      throw new NotFoundException('پرداخت قسط در انتظار بررسی پیدا نشد.');
    }
    if (payment.registration.studentId == null) throw new ConflictException('این پرداخت به حساب هنرجویی متصل نیست.');
    if (payment.receipts.length === 0) throw new BadRequestException('برای این پرداخت رسید ثبت نشده است.');
    if (dto.status === 'REJECTED' && !dto.rejectionReason?.trim()) {
      throw new BadRequestException('علت رد رسید الزامی است.');
    }
    const approvedAmount = dto.status === 'APPROVED' ? Number(dto.approvedAmount ?? payment.claimedAmount) : null;
    if (dto.status === 'APPROVED' && (!Number.isFinite(approvedAmount) || approvedAmount! <= 0)) {
      throw new BadRequestException('مبلغ تأییدشده باید بیشتر از صفر باشد.');
    }

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.registrationPayment.updateMany({
        where: { id: paymentId, status: 'PENDING' },
        data: {
          status: dto.status,
          approvedAmount,
          rejectionReason: dto.status === 'REJECTED' ? dto.rejectionReason!.trim() : null,
          reviewNote: dto.reviewNote?.trim() || null,
          reviewedById: actor.id,
          reviewedAt: new Date(),
        },
      });
      if (current.count !== 1) throw new ConflictException('این رسید هم‌زمان توسط کاربر دیگری بررسی شده است.');

      if (dto.status === 'APPROVED') {
        const registrations = await tx.registration.findMany({
          where: { studentId: payment.registration.studentId, status: 'APPROVED' },
          select: { id: true, installments: { include: { allocations: { select: { amount: true } } } } },
        });
        const debt = registrations.flatMap((registration) => registration.installments.map((item) => ({
          id: item.id,
          dueDate: item.dueDate,
          amount: Number(item.amount),
          allocated: item.allocations.reduce((sum, allocation) => sum + Number(allocation.amount), 0),
        }))).filter((item) => item.amount - item.allocated > 0.0001)
          .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
        const outstanding = debt.reduce((sum, item) => sum + item.amount - item.allocated, 0);
        if (approvedAmount! > outstanding + 0.0001) {
          throw new BadRequestException('مبلغ تأییدشده از کل بدهی باقی‌مانده بیشتر است.');
        }
        let left = approvedAmount!;
        for (const item of debt) {
          if (left <= 0.0001) break;
          const allocationAmount = Math.min(left, item.amount - item.allocated);
          await tx.paymentAllocation.create({
            data: { paymentId, installmentId: item.id, amount: allocationAmount },
          });
          const paidAfter = item.allocated + allocationAmount;
          const status = paidAfter + 0.0001 >= item.amount
            ? 'PAID'
            : item.dueDate.getTime() < Date.now() ? 'OVERDUE' : 'PARTIALLY_PAID';
          await tx.installment.update({ where: { id: item.id }, data: { status } });
          left = Math.round((left - allocationAmount) * 100) / 100;
        }
      }

      await tx.registrationReviewHistory.create({
        data: {
          registrationId: payment.registrationId, actorUserId: actor.id,
          action: dto.status === 'APPROVED' ? 'INSTALLMENT_PAYMENT_APPROVED' : 'INSTALLMENT_PAYMENT_REJECTED',
          note: dto.status === 'REJECTED' ? dto.rejectionReason!.trim() : dto.reviewNote?.trim() || null,
          metadata: { paymentId, claimedAmount: Number(payment.claimedAmount), approvedAmount },
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: actor.id,
          action: dto.status === 'APPROVED' ? 'INSTALLMENT_PAYMENT_APPROVED' : 'INSTALLMENT_PAYMENT_REJECTED',
          entityType: 'RegistrationPayment', entityId: paymentId,
          metadata: { claimedAmount: Number(payment.claimedAmount), approvedAmount, reason: dto.rejectionReason ?? null },
        },
      });
      return { success: true, paymentId, status: dto.status, approvedAmount };
    }, { isolationLevel: 'Serializable' });
  }

  async listStudentRegistrations(actor: AuthenticatedUser) {
    if (actor.role !== 'STUDENT' || !actor.studentId) throw new ForbiddenException('Student access required');
    const rows = await this.prisma.registration.findMany({
      where: { studentId: actor.studentId, status: 'APPROVED' },
      include: {
        courses: { select: { id: true, courseTitleSnapshot: true, coursePriceSnapshot: true } },
        installments: {
          include: { allocations: { select: { amount: true, payment: { select: { status: true } } } } },
          orderBy: [{ dueDate: 'asc' }, { sequence: 'asc' }],
        },
        payments: { where: { purpose: 'INSTALLMENT' }, orderBy: { createdAt: 'desc' }, select: { id: true, status: true, claimedAmount: true, approvedAmount: true, rejectionReason: true, paymentDate: true, createdAt: true } },
      },
      orderBy: { approvedAt: 'desc' },
    });
    return rows.map((row) => ({
      id: row.id, status: row.status, approvalMode: row.approvalMode,
      originalTuition: Number(row.originalTuition), discountAmount: Number(row.discountAmount),
      finalTuition: Number(row.finalTuition), discountReason: row.discountReason,
      exceptionReason: row.exceptionReason, approvedAt: row.approvedAt,
      courses: row.courses.map((course) => ({ ...course, coursePriceSnapshot: Number(course.coursePriceSnapshot) })),
      installments: row.installments.map((item) => {
        const paid = item.allocations.filter((a) => a.payment.status === 'APPROVED').reduce((sum, a) => sum + Number(a.amount), 0);
        return { id: item.id, sequence: item.sequence, amount: Number(item.amount), paid, balance: Math.max(0, Number(item.amount) - paid), dueDate: item.dueDate, status: item.status };
      }),
      payments: row.payments.map((payment) => ({
        ...payment, claimedAmount: Number(payment.claimedAmount),
        approvedAmount: payment.approvedAmount === null ? null : Number(payment.approvedAmount),
      })),
    }));
  }

  async listStudentRefundRequests(actor: AuthenticatedUser) {
    if (actor.role !== 'STUDENT' || !actor.studentId) throw new ForbiddenException('Student access required');
    return this.prisma.refundRequest.findMany({
      where: { studentId: actor.studentId },
      orderBy: { requestedAt: 'desc' },
      select: {
        id: true, registrationId: true, amountRequested: true, amountReserved: true,
        status: true, reason: true, reviewNote: true, transferReference: true,
        requestedAt: true, approvedAt: true, paidAt: true,
      },
    }).then((rows) => rows.map((row) => ({
      ...row,
      amountRequested: Number(row.amountRequested),
      amountReserved: row.amountReserved === null ? null : Number(row.amountReserved),
    })));
  }

  async createRefundRequest(actor: AuthenticatedUser, dto: CreateRefundRequestDto) {
    if (actor.role !== 'STUDENT' || !actor.studentId) throw new ForbiddenException('Student access required');
    if (!Number.isFinite(dto.amountRequested) || dto.amountRequested <= 0) throw new BadRequestException('مبلغ بازپرداخت معتبر نیست.');
    const registration = await this.prisma.registration.findFirst({
      where: { id: dto.registrationId, studentId: actor.studentId, status: 'APPROVED' },
      select: { id: true },
    });
    if (!registration) throw new NotFoundException('ثبت‌نام تأییدشده پیدا نشد.');
    return this.prisma.refundRequest.create({
      data: {
        registrationId: registration.id,
        studentId: actor.studentId,
        amountRequested: dto.amountRequested,
        reason: dto.reason.trim(),
      },
      select: { id: true, status: true, amountRequested: true, requestedAt: true },
    }).then((row) => ({ ...row, amountRequested: Number(row.amountRequested) }));
  }

  async listAdminRefundRequests(actor: AuthenticatedUser, status?: string) {
    this.requireFinanceAccess(actor);
    const allowed = ['REQUESTED', 'RESERVED', 'PAID', 'REJECTED'];
    if (status && status !== 'ALL' && !allowed.includes(status)) throw new BadRequestException('Invalid refund status');
    return this.prisma.refundRequest.findMany({
      where: status && status !== 'ALL' ? { status: status as any } : undefined,
      include: {
        student: { select: { fullName: true, nationalId: true, phone: true } },
        registration: { select: { finalTuition: true, status: true } },
      },
      orderBy: { requestedAt: 'asc' },
    }).then((rows) => rows.map((row) => ({
      ...row,
      amountRequested: Number(row.amountRequested),
      amountReserved: row.amountReserved === null ? null : Number(row.amountReserved),
      registration: { ...row.registration, finalTuition: Number(row.registration.finalTuition) },
    })));
  }

  async reviewRefundRequest(actor: AuthenticatedUser, refundId: string, decision: 'RESERVE' | 'REJECT', note?: string) {
    this.requireFinanceAccess(actor);
    if (decision === 'REJECT' && !note?.trim()) throw new BadRequestException('علت رد درخواست بازپرداخت الزامی است.');
    return this.prisma.$transaction(async (tx) => {
      const refund = await tx.refundRequest.findUnique({ where: { id: refundId } });
      if (!refund || refund.status !== 'REQUESTED') throw new ConflictException('این درخواست قبلاً بررسی شده یا وجود ندارد.');
      if (decision === 'REJECT') {
        const changed = await tx.refundRequest.updateMany({
          where: { id: refundId, status: 'REQUESTED' },
          data: { status: 'REJECTED', reviewedById: actor.id, approvedAt: new Date(), reviewNote: note!.trim() },
        });
        if (changed.count !== 1) throw new ConflictException('درخواست هم‌زمان بررسی شده است.');
        await tx.auditLog.create({
          data: { actorUserId: actor.id, action: 'REFUND_REJECTED', entityType: 'RefundRequest', entityId: refundId, metadata: { reason: note!.trim() } },
        });
        return { success: true, status: 'REJECTED' };
      }

      const registrations = await tx.registration.findMany({
        where: { studentId: refund.studentId, status: 'APPROVED' },
        select: {
          id: true, finalTuition: true,
          courses: { select: { courseId: true } },
          payments: { where: { status: 'APPROVED' }, select: { approvedAmount: true } },
        },
      });
      const registeredCourseIds = [...new Set(registrations.flatMap((row) => row.courses.map((course) => course.courseId)))];
      const legacyEnrollments = await tx.enrollment.findMany({
        where: {
          studentId: refund.studentId,
          status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
          ...(registeredCourseIds.length ? { courseId: { notIn: registeredCourseIds } } : {}),
        },
        select: { tuitionAmount: true, course: { select: { price: true } } },
      });
      const legacyPayments = await tx.payment.findMany({
        where: { studentId: refund.studentId, purpose: 'COURSE_FEE', status: 'APPROVED' },
        select: { amount: true },
      });
      const tuition = registrations.reduce((sum, row) => sum + Number(row.finalTuition), 0)
        + legacyEnrollments.reduce((sum, enrollment) => sum + Number(enrollment.tuitionAmount ?? enrollment.course.price ?? 0), 0);
      const paid = registrations.reduce((sum, row) => sum + row.payments.reduce((p, payment) => p + Number(payment.approvedAmount ?? 0), 0), 0)
        + legacyPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
      const previousRefunds = await tx.refundRequest.findMany({
        where: { studentId: refund.studentId, status: { in: ['RESERVED', 'PAID'] } },
        select: { amountReserved: true },
      });
      const alreadyReserved = previousRefunds.reduce((sum, item) => sum + Number(item.amountReserved ?? 0), 0);
      const available = Math.max(0, paid - tuition - alreadyReserved);
      if (Number(refund.amountRequested) > available + 0.0001) {
        throw new BadRequestException('موجودی قابل بازپرداخت کافی نیست؛ بدهی‌های ثبت‌نام‌های دیگر ابتدا از اضافه‌پرداخت کسر می‌شوند.');
      }
      const changed = await tx.refundRequest.updateMany({
        where: { id: refundId, status: 'REQUESTED' },
        data: {
          status: 'RESERVED', amountReserved: refund.amountRequested,
          reviewedById: actor.id, approvedAt: new Date(), reviewNote: note?.trim() || null,
        },
      });
      if (changed.count !== 1) throw new ConflictException('درخواست هم‌زمان بررسی شده است.');
      await tx.auditLog.create({
        data: {
          actorUserId: actor.id, action: 'REFUND_RESERVED',
          entityType: 'RefundRequest', entityId: refundId,
          metadata: { amountReserved: Number(refund.amountRequested), availableBeforeReservation: available },
        },
      });
      return { success: true, status: 'RESERVED', amountReserved: Number(refund.amountRequested) };
    }, { isolationLevel: 'Serializable' });
  }

  async markRefundPaid(actor: AuthenticatedUser, refundId: string, dto: MarkRefundPaidDto) {
    this.requireFinanceAccess(actor);
    return this.prisma.$transaction(async (tx) => {
      const changed = await tx.refundRequest.updateMany({
        where: { id: refundId, status: 'RESERVED' },
        data: { status: 'PAID', paidById: actor.id, paidAt: new Date(), transferReference: dto.transferReference.trim() },
      });
      if (changed.count !== 1) throw new ConflictException('فقط درخواست رزروشده را می‌توان پرداخت‌شده ثبت کرد.');
      const refund = await tx.refundRequest.findUniqueOrThrow({
        where: { id: refundId },
        select: { amountReserved: true, studentId: true, registrationId: true },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: actor.id, action: 'REFUND_MARKED_PAID',
          entityType: 'RefundRequest', entityId: refundId,
          metadata: { amountPaid: Number(refund.amountReserved ?? 0), transferReference: dto.transferReference.trim() },
        },
      });
      return { success: true, status: 'PAID', amountPaid: Number(refund.amountReserved ?? 0) };
    }, { isolationLevel: 'Serializable' });
  }

  private parseCourseIds(value: string): string[] {
    let parsed: unknown;
    try { parsed = JSON.parse(value); } catch { throw new BadRequestException('فهرست دوره‌ها معتبر نیست.'); }
    if (!Array.isArray(parsed) || parsed.length === 0 || parsed.some((id) => typeof id !== 'string' || !id.trim())) {
      throw new BadRequestException('حداقل یک دوره باید انتخاب شود.');
    }
    const ids = [...new Set(parsed.map((id) => id.trim()))];
    if (ids.length !== parsed.length) throw new BadRequestException('یک دوره را بیش از یک بار انتخاب کرده‌اید.');
    return ids;
  }

  private validateReceipt(file: any) {
    if (!file?.buffer || !file.mimetype || !ALLOWED_RECEIPT_TYPES[file.mimetype]) {
      throw new BadRequestException('رسید باید تصویر JPG، PNG یا WEBP باشد.');
    }
    if (file.size > 8 * 1024 * 1024) throw new BadRequestException('حداکثر حجم رسید ۸ مگابایت است.');
    const bytes: Buffer = file.buffer;
    const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isPng = bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const isWebp = bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
    if ((file.mimetype === 'image/jpeg' && !isJpeg)
      || (file.mimetype === 'image/png' && !isPng)
      || (file.mimetype === 'image/webp' && !isWebp)) {
      throw new BadRequestException('محتوای فایل با نوع تصویر اعلام‌شده مطابقت ندارد.');
    }
  }

  private async storeReceipt(file: any): Promise<string> {
    const extension = ALLOWED_RECEIPT_TYPES[file.mimetype];
    const key = randomUUID() + extension;
    await mkdir(RECEIPT_DIR, { recursive: true });
    await writeFile(join(RECEIPT_DIR, key), file.buffer, { flag: 'wx', mode: 0o640 });
    return key;
  }

  private addOneMonthClamped(date: Date): Date {
    const next = new Date(date);
    const day = next.getDate();
    next.setDate(1);
    next.setMonth(next.getMonth() + 1);
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(day, lastDay));
    return next;
  }

  private requireFinanceAccess(actor: AuthenticatedUser) {
    if (actor.role === 'SUPER_ADMIN') return;
    if (actor.role !== 'STAFF' || !actor.permissions.includes('finance')) {
      throw new ForbiddenException('Finance permission required');
    }
  }
}
