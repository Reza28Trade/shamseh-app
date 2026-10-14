import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException,
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

const RECEIPT_DIR = process.env.REGISTRATION_RECEIPT_STORAGE_PATH
  || join(process.env.FILE_STORAGE_PATH || '/opt/shamseh-app/storage/files', 'registration-receipts');
const ALLOWED_RECEIPT_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

@Injectable()
export class RegistrationsService {
  constructor(private readonly prisma: PrismaService) {}

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
      where: { nationalId }, select: { id: true },
    });
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
    if (!Number.isFinite(dto.claimedAmount) || dto.claimedAmount <= 0 || dto.claimedAmount > originalTuition) {
      throw new BadRequestException('مبلغ رسید باید بیشتر از صفر و حداکثر برابر شهریه دوره‌ها باشد.');
    }

    const storageKey = await this.storeReceipt(file);
    try {
      const registration = await this.prisma.$transaction(async (tx) => {
        const created = await tx.registration.create({
          data: {
            applicantFullName: dto.applicantFullName.trim(),
            nationalId,
            phone,
            academicLevel: dto.academicLevel,
            fieldCode: dto.fieldCode.trim(),
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

  async uploadCorrectionReceipt(registrationId: string, body: { claimedAmount: number; paymentDate?: string; trackingCode?: string }, file: any) {
    this.validateReceipt(file);
    if (!Number.isFinite(Number(body.claimedAmount)) || Number(body.claimedAmount) <= 0) {
      throw new BadRequestException('مبلغ پرداخت باید بیشتر از صفر باشد.');
    }
    const registration = await this.prisma.registration.findUnique({
      where: { id: registrationId }, select: { id: true, status: true, originalTuition: true },
    });
    if (!registration || !['NEEDS_CORRECTION', 'PENDING_REVIEW'].includes(registration.status)) {
      throw new NotFoundException('ثبت‌نامی برای اصلاح رسید پیدا نشد.');
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
    const otherApproved = registration.payments.reduce((sum, p) => sum + Number(p.approvedAmount ?? 0), 0);
    const totalPaid = otherApproved + Number(dto.approvedAmount);
    if (!Number.isFinite(totalPaid) || totalPaid <= 0) throw new BadRequestException('مبلغ تأییدشده معتبر نیست.');
    if (totalPaid > finalTuition) throw new BadRequestException('مبلغ پرداخت از شهریه نهایی بیشتر است؛ ابتدا باید نحوه تخصیص اضافه‌پرداخت مشخص شود.');
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
          },
          include: { user: true },
        });
      } else {
        // Existing students keep their management-controlled profile data.
        // A new registration must not silently change their phone or field code.
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
      await tx.registration.update({ where: { id: registrationId }, data: { status: 'REJECTED', reviewedById: actor.id, reviewedAt: new Date(), reviewNote: reason.trim() } });
      await tx.registrationReviewHistory.create({
        data: { registrationId, actorUserId: actor.id, action: 'REJECTED', fromStatus: registration.status, toStatus: 'REJECTED', note: reason.trim() },
      });
      await tx.auditLog.create({ data: { actorUserId: actor.id, action: 'REGISTRATION_REJECTED', entityType: 'Registration', entityId: registrationId, metadata: { reason: reason.trim() } } });
      return { success: true, status: 'REJECTED' };
    });
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
