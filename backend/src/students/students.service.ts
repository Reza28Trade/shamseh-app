import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { CreateStudentDto } from './dto/create-student.dto';
import { ResetStudentPasswordDto } from './dto/reset-student-password.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { Response } from 'express';
const ExcelJS = require('exceljs');

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  private requireAdmin(user: AuthenticatedUser) {
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'STAFF') {
      throw new ForbiddenException('Admin access required');
    }
  }

  async listStudents(user: AuthenticatedUser) {
    this.requireAdmin(user);
    return this.prisma.student.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, fullName: true, nationalId: true, phone: true, academicLevel: true, isArchived: true,
        user: { select: { id: true, username: true, status: true, createdAt: true } },
        enrollments: {
          select: { id: true, status: true, courseId: true, enrolledAt: true, course: { select: { id: true, title: true, level: true, academicYear: true, term: true } } },
        },
      },
    });
  }


  async setStudentArchived(user: AuthenticatedUser, studentId: string, isArchived: boolean) {
    this.requireAdmin(user);
    const student = await this.prisma.student.findUnique({
      where: { id: studentId }, select: { id: true, userId: true },
    });
    if (!student) throw new NotFoundException('Student not found');

    const updated = await this.prisma.student.update({
      where: { id: studentId }, data: { isArchived }, select: { id: true, isArchived: true },
    });

    // Revoke existing sessions on archive and restore so archived accounts
    // cannot retain access, and restored accounts must authenticate afresh.
    await this.prisma.session.deleteMany({ where: { userId: student.userId } });

    return updated;
  }

  async exportStudents(user: AuthenticatedUser, res: Response) {
    this.requireAdmin(user);
    const students = await this.prisma.student.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        fullName: true, nationalId: true, phone: true,
        user: { select: { username: true, status: true } },
        enrollments: { select: { status: true, course: { select: { title: true } } }, orderBy: { enrolledAt: 'asc' } },
      },
    });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Students');
    sheet.columns = [
      { header: 'نام و نام خانوادگی', key: 'fullName', width: 28 },
      { header: 'کد ملی', key: 'nationalId', width: 16 },
      { header: 'شماره موبایل', key: 'phone', width: 16 },
      { header: 'نام کاربری', key: 'username', width: 16 },
      { header: 'وضعیت حساب', key: 'status', width: 16 },
      { header: 'دوره‌ها', key: 'courses', width: 50 },
    ];
    for (const student of students) {
      sheet.addRow({ fullName: student.fullName, nationalId: student.nationalId, phone: student.phone, username: student.user.username, status: student.user.status, courses: student.enrollments.map((e: any) => e.course.title + ' (' + e.status + ')').join('، ') });
    }
    sheet.getRow(1).font = { bold: true };
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', "attachment; filename*=UTF-8''students.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  }


  async importStudents(user: AuthenticatedUser, file: any, preview = false) {
    this.requireAdmin(user);
    if (!file?.buffer) throw new ConflictException('فایل Excel انتخاب نشده است.');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new ConflictException('برگه‌ای برای وارد کردن هنرجویان پیدا نشد.');

    const normalize = (value: unknown) => String(value ?? '').trim();
    const levelMap: Record<string, 'MASTER' | 'DOCTORATE'> = {
      'ارشد': 'MASTER', 'master': 'MASTER', 'MASTER': 'MASTER',
      'دکتری': 'DOCTORATE', 'دکترا': 'DOCTORATE', 'doctorate': 'DOCTORATE', 'DOCTORATE': 'DOCTORATE',
    };
    const headers = new Map<string, number>();
    sheet.getRow(1).eachCell((cell: any, col: number) => headers.set(normalize(cell.value), col));
    const col = (...names: string[]) => names.map(name => headers.get(name)).find(Boolean);
    const value = (row: any, ...names: string[]) => {
      const index = col(...names);
      return index ? normalize(row.getCell(index).value) : '';
    };

    const required = [
      ['نام و نام خانوادگی', 'fullName'],
      ['کد ملی', 'nationalId'],
      ['شماره موبایل', 'phone'],
      ['مقطع', 'academicLevel'],
      ['دوره', 'course'],
    ];
    const missing = required.filter(names => !col(...names));
    if (missing.length) throw new ConflictException('ستون‌های الزامی Excel ناقص است: ' + missing.map(names => names[0]).join('، '));

    const rows: Array<{ row: number; fullName: string; nationalId: string; phone: string; academicLevel: 'MASTER'|'DOCTORATE'; courseTitle: string; academicYear?: number; term?: string }> = [];
    const errors: string[] = [];
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      const fullName = value(row, 'نام و نام خانوادگی', 'fullName');
      const nationalId = value(row, 'کد ملی', 'nationalId');
      const phone = value(row, 'شماره موبایل', 'phone');
      const levelRaw = value(row, 'مقطع', 'academicLevel');
      const courseTitle = value(row, 'دوره', 'course');
      const yearRaw = value(row, 'سال تحصیلی', 'academicYear');
      const term = value(row, 'ترم', 'term');
      if (!fullName && !nationalId && !phone && !courseTitle) continue;
      const academicLevel = levelMap[levelRaw];
      const academicYear = yearRaw ? Number(yearRaw) : undefined;
      if (!fullName || !nationalId || !phone || !academicLevel || !courseTitle) {
        errors.push(`ردیف ${rowNumber}: نام، کد ملی، موبایل، مقطع و دوره الزامی است.`);
        continue;
      }
      if (yearRaw && (!Number.isInteger(academicYear) || academicYear! < 1300)) {
        errors.push(`ردیف ${rowNumber}: سال تحصیلی معتبر نیست.`);
        continue;
      }
      rows.push({ row: rowNumber, fullName, nationalId, phone, academicLevel, courseTitle, academicYear, term });
    }

    const previewRows: Array<Record<string, string>> = [];
    let created = 0;
    let updated = 0;
    let enrolled = 0;
    for (const item of rows) {
      const course = await this.prisma.course.findFirst({
        where: {
          title: item.courseTitle,
          ...(item.academicYear ? { academicYear: item.academicYear } : {}),
          ...(item.term ? { term: item.term } : {}),
          level: item.academicLevel,
        },
        select: { id: true, title: true, academicYear: true, term: true, level: true, price: true },
      });
      if (!course) {
        errors.push(`ردیف ${item.row}: دوره «${item.courseTitle}» با مقطع/سال/ترم مشخص‌شده پیدا نشد.`);
        continue;
      }
      const existing = await this.prisma.student.findUnique({ where: { nationalId: item.nationalId }, select: { id: true, userId: true } });
      const alreadyEnrolled = existing ? await this.prisma.enrollment.findUnique({ where: { studentId_courseId: { studentId: existing.id, courseId: course.id } }, select: { id: true } }) : null;
      previewRows.push({
        row: String(item.row),
        name: item.fullName,
        nationalId: item.nationalId,
        course: course.title,
        term: course.term || '',
        academicYear: course.academicYear ? String(course.academicYear) : '',
        status: existing ? (alreadyEnrolled ? 'ثبت شده' : 'هنرجوی موجود') : 'هنرجوی جدید',
      });
      if (!preview) {
        if (existing) {
          await this.prisma.$transaction(async tx => {
            await tx.student.update({ where: { id: existing.id }, data: { fullName: item.fullName, phone: item.phone, academicLevel: item.academicLevel } });
            await tx.user.update({ where: { id: existing.userId }, data: { username: item.nationalId, passwordHash: await argon2.hash(item.phone) } });
          });
          updated += 1;
          if (!alreadyEnrolled) {
            await this.prisma.enrollment.create({ data: { studentId: existing.id, courseId: course.id, tuitionAmount: course.price } });
            enrolled += 1;
          }
        } else {
          const passwordHash = await argon2.hash(item.phone);
          const createdUser = await this.prisma.user.create({
            data: { username: item.nationalId, passwordHash, role: 'STUDENT', student: { create: { fullName: item.fullName, nationalId: item.nationalId, phone: item.phone, academicLevel: item.academicLevel } } },
            select: { student: { select: { id: true } } },
          });
          await this.prisma.enrollment.create({ data: { studentId: createdUser.student!.id, courseId: course.id, tuitionAmount: course.price } });
          created += 1;
          enrolled += 1;
        }
      }
    }
    return { preview, total: rows.length, valid: previewRows.length, created, updated, enrolled, skipped: errors.length, errors: errors.slice(0, 30), rows: previewRows.slice(0, 100) };
  }

  async exportStudentTemplate(user: AuthenticatedUser, res: Response) {
    this.requireAdmin(user);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Students');
    sheet.views = [{ rightToLeft: true }];
    sheet.columns = [
      { header: 'نام و نام خانوادگی', key: 'fullName', width: 28 },
      { header: 'کد ملی', key: 'nationalId', width: 16 },
      { header: 'شماره موبایل', key: 'phone', width: 16 },
      { header: 'مقطع', key: 'academicLevel', width: 14 },
      { header: 'سال تحصیلی', key: 'academicYear', width: 14 },
      { header: 'ترم', key: 'term', width: 14 },
      { header: 'دوره', key: 'course', width: 34 },
    ];
    sheet.addRow({ fullName: 'علی رضایی', nationalId: '0012345678', phone: '09121234567', academicLevel: 'ارشد', academicYear: 1405, term: 'پاییز', course: 'نام دقیق دوره' });
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3F8F8A' } };
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', "attachment; filename*=UTF-8''students-template.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  }

  async createStudent(user: AuthenticatedUser, dto: CreateStudentDto) {
    this.requireAdmin(user);
    const passwordHash = await argon2.hash(dto.phone);
    try {
      return await this.prisma.user.create({
        data: {
          username: dto.nationalId,
          passwordHash,
          role: 'STUDENT',
          student: {
            create: {
              fullName: dto.fullName,
              nationalId: dto.nationalId,
              phone: dto.phone,
              academicLevel: dto.academicLevel,
            },
          },
        },
        select: {
          id: true, username: true, role: true, status: true,
          student: { select: { id: true, fullName: true, nationalId: true, phone: true, academicLevel: true } },
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') throw new ConflictException('Username or national ID already exists');
      throw error;
    }
  }

  async updateStudent(user: AuthenticatedUser, studentId: string, dto: UpdateStudentDto) {
    this.requireAdmin(user);
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, userId: true, nationalId: true, phone: true, academicLevel: true },
    });
    if (!student) throw new NotFoundException('Student not found');

    const nationalId = dto.nationalId ?? student.nationalId;
    const phone = dto.phone ?? student.phone;
    if (!phone) throw new ConflictException('Student phone is required');

    const passwordHash = await argon2.hash(phone);

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: student.userId },
          data: { username: nationalId, passwordHash },
        });

        const updated = await tx.student.update({
          where: { id: studentId },
          data: {
            ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
            nationalId,
            phone,
            ...(dto.academicLevel !== undefined ? { academicLevel: dto.academicLevel } : {}),
          },
          select: {
            id: true,
            fullName: true,
            nationalId: true,
            phone: true,
          },
        });

        if (dto.courseIds !== undefined) {
          const desiredCourseIds = [...new Set(dto.courseIds)];
          if (desiredCourseIds.length === 0) {
            await tx.enrollment.updateMany({
              where: { studentId, status: { not: 'CANCELLED' } },
              data: { status: 'CANCELLED' },
            });
          } else {
            await tx.enrollment.updateMany({
              where: { studentId, courseId: { notIn: desiredCourseIds }, status: { not: 'CANCELLED' } },
              data: { status: 'CANCELLED' },
            });
            const existingEnrollments = await tx.enrollment.findMany({
              where: { studentId, courseId: { in: desiredCourseIds } },
              select: { courseId: true, status: true },
            });
            const existingCourseIds = new Set(existingEnrollments.map((enrollment) => enrollment.courseId));
            await tx.enrollment.updateMany({
              where: { studentId, courseId: { in: [...existingCourseIds] }, status: { not: 'ACTIVE' } },
              data: { status: 'ACTIVE' },
            });
            const newCourseIds = desiredCourseIds.filter((courseId) => !existingCourseIds.has(courseId));
            if (newCourseIds.length > 0) {
              const coursePrices = await tx.course.findMany({
                where: { id: { in: newCourseIds } },
                select: { id: true, price: true },
              });
              await tx.enrollment.createMany({
                data: newCourseIds.map((courseId) => ({
                  studentId,
                  courseId,
                  tuitionAmount: coursePrices.find((course) => course.id === courseId)?.price ?? null,
                })),
                skipDuplicates: true,
              });
            }
          }
        }

        return updated;
      });
    } catch (error: any) {
      if (error?.code === 'P2002') throw new ConflictException('Username or national ID already exists');
      throw error;
    }
  }

  async createManualStudentFinance(user: AuthenticatedUser, studentId: string, body: any) {
    this.requireAdmin(user);
    const money = (value: unknown, label: string) => {
      const amount = Number(value);
      if (!Number.isFinite(amount) || amount < 0 || !Number.isInteger(amount)) {
        throw new ConflictException(label + ' باید عدد صحیح و نامنفی باشد.');
      }
      return amount;
    };
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new NotFoundException('Student not found');
    const courseIds = Array.isArray(body?.courseIds) ? [...new Set(body.courseIds.map((v: unknown) => String(v)))] : [];
    const payments = Array.isArray(body?.payments) ? body.payments : [];
    const installments = Array.isArray(body?.installments) ? body.installments : [];
    if (!courseIds.length) throw new ConflictException('حداقل یک دوره انتخاب کنید.');
    if (!installments.length) throw new ConflictException('حداقل یک قسط با تاریخ سررسید دستی لازم است.');
    const originalTuition = money(body.originalTuition, 'شهریه اولیه');
    const discountAmount = money(body.discountAmount ?? 0, 'تخفیف');
    if (originalTuition <= 0 || discountAmount > originalTuition) throw new ConflictException('مبلغ شهریه یا تخفیف معتبر نیست.');
    const finalTuition = originalTuition - discountAmount;
    const paymentRows = payments.map((p: any) => {
      const amount = money(p.amount, 'مبلغ پرداخت');
      const paymentDate = new Date(p.paymentDate);
      if (amount <= 0 || !p.paymentDate || Number.isNaN(paymentDate.getTime())) throw new ConflictException('مبلغ و تاریخ هر پرداخت باید معتبر باشد.');
      const method = ['CASH', 'BANK_TRANSFER', 'CARD', 'OTHER'].includes(p.method) ? p.method : 'OTHER';
      return { amount, paymentDate, method, reference: p.reference ? String(p.reference).slice(0, 250) : null };
    });
    const installmentRows = installments.map((i: any) => {
      const amount = money(i.amount, 'مبلغ قسط');
      const dueDate = new Date(i.dueDate);
      if (amount <= 0 || !i.dueDate || Number.isNaN(dueDate.getTime())) throw new ConflictException('مبلغ و تاریخ سررسید هر قسط باید معتبر باشد.');
      return { amount, dueDate };
    }).sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
      .map((installment, index) => ({ ...installment, sequence: index + 1 }));
    const paymentTotal = paymentRows.reduce((sum: number, p: any) => sum + p.amount, 0);
    const installmentTotal = installmentRows.reduce((sum: number, i: any) => sum + i.amount, 0);
    if (paymentTotal > finalTuition) throw new ConflictException('مجموع پرداخت‌ها از شهریه نهایی بیشتر است.');
    if (installmentTotal !== finalTuition) throw new ConflictException('مجموع مبالغ اقساط باید برابر شهریه نهایی باشد؛ پرداخت‌های قبلی به‌عنوان تخصیص روی همین اقساط اعمال می‌شوند.');
    const courses = await this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true, price: true } });
    if (courses.length !== courseIds.length) throw new ConflictException('یکی از دوره‌های انتخاب‌شده پیدا نشد.');
    const existingFinancialCourses = await this.prisma.registrationCourse.findMany({
      where: { courseId: { in: courseIds }, registration: { studentId, status: 'APPROVED' } },
      select: { courseTitleSnapshot: true },
    });
    if (existingFinancialCourses.length) {
      throw new ConflictException('برای این هنرجو از قبل پرونده مالی تأییدشده برای این دوره‌ها وجود دارد: ' + existingFinancialCourses.map((course: any) => course.courseTitleSnapshot).join('، '));
    }
    return this.prisma.$transaction(async tx => {
      const registration = await tx.registration.create({
        data: {
          applicantFullName: student.fullName, nationalId: student.nationalId, phone: student.phone,
          academicLevel: student.academicLevel, fieldCode: 'MANUAL', studentId,
          status: 'APPROVED', approvalMode: discountAmount > 0 ? 'DISCOUNT' : 'NORMAL',
          originalTuition, discountAmount, finalTuition,
          discountReason: body.discountReason ? String(body.discountReason).slice(0, 2000) : null,
          reviewNote: 'پرونده مالی ثبت‌شده دستی توسط مدیریت',
          reviewedById: user.id, reviewedAt: new Date(), approvedAt: new Date(),
          courses: { create: courses.map(course => ({
            courseId: course.id, courseTitleSnapshot: course.title, coursePriceSnapshot: course.price,
          })) },
          installments: { create: installmentRows.map(i => ({
            sequence: i.sequence, amount: i.amount, dueDate: i.dueDate,
          })) },
        },
        include: { installments: { orderBy: { dueDate: 'asc' } } },
      });
      for (const course of courses) {
        await tx.enrollment.upsert({
          where: { studentId_courseId: { studentId, courseId: course.id } },
          create: { studentId, courseId: course.id, tuitionAmount: course.price },
          update: { tuitionAmount: course.price },
        });
      }
      let remainingByInstallment = registration.installments.map((i: any) => Number(i.amount));
      for (const payment of paymentRows) {
        const record = await tx.registrationPayment.create({
          data: {
            registrationId: registration.id, purpose: 'INITIAL', status: 'APPROVED',
            claimedAmount: payment.amount, approvedAmount: payment.amount,
            paymentDate: payment.paymentDate, method: payment.method, reference: payment.reference,
            reviewNote: 'پرداخت تاریخی واردشده توسط مدیریت', reviewedById: user.id, reviewedAt: new Date(),
          },
        });
        let remainingPayment = payment.amount;
        for (let index = 0; index < registration.installments.length && remainingPayment > 0; index++) {
          const allocated = Math.min(remainingPayment, remainingByInstallment[index]);
          if (allocated <= 0) continue;
          await tx.paymentAllocation.create({ data: { paymentId: record.id, installmentId: registration.installments[index].id, amount: allocated } });
          remainingByInstallment[index] -= allocated;
          remainingPayment -= allocated;
        }
      }
      for (let index = 0; index < registration.installments.length; index++) {
        const original = Number(registration.installments[index].amount);
        const paid = original - remainingByInstallment[index];
        await tx.installment.update({
          where: { id: registration.installments[index].id },
          data: { status: paid >= original ? 'PAID' : paid > 0 ? 'PARTIALLY_PAID' : 'PENDING' },
        });
      }
      await tx.registrationReviewHistory.create({
        data: { registrationId: registration.id, actorUserId: user.id, action: 'MANUAL_FINANCE_CREATED', toStatus: 'APPROVED', note: 'ثبت دستی پرونده مالی هنرجوی موجود' },
      });
      return { success: true, registrationId: registration.id };
    });
  }

  async getStudentFinance(user: AuthenticatedUser, studentId: string) {
    this.requireAdmin(user);
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true, fullName: true, nationalId: true,
        registrations: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, status: true, approvalMode: true, originalTuition: true,
            discountAmount: true, finalTuition: true, createdAt: true,
            courses: { select: { courseTitleSnapshot: true, coursePriceSnapshot: true } },
            payments: {
              orderBy: { paymentDate: 'desc' },
              select: { id: true, purpose: true, status: true, claimedAmount: true, approvedAmount: true, paymentDate: true, method: true, trackingCode: true, reference: true },
            },
            installments: {
              orderBy: [{ dueDate: 'asc' }, { sequence: 'asc' }],
              select: {
                id: true, sequence: true, amount: true, dueDate: true, status: true,
                allocations: { select: { amount: true, payment: { select: { status: true } } } },
              },
            },
          },
        },
      },
    });
    if (!student) throw new NotFoundException('Student not found');
    return {
      ...student,
      registrations: student.registrations.map((registration: any) => {
        const installments = registration.installments.map((installment: any) => {
          const paid = installment.allocations
            .filter((allocation: any) => allocation.payment.status === 'APPROVED')
            .reduce((sum: number, allocation: any) => sum + Number(allocation.amount), 0);
          return {
            id: installment.id, sequence: installment.sequence, amount: Number(installment.amount),
            dueDate: installment.dueDate, status: installment.status,
            paid: Math.min(Number(installment.amount), paid),
            balance: Math.max(0, Number(installment.amount) - paid),
          };
        });
        const paidTotal = installments.reduce((sum: number, installment: any) => sum + installment.paid, 0);
        return {
          ...registration,
          originalTuition: Number(registration.originalTuition),
          discountAmount: Number(registration.discountAmount),
          finalTuition: Number(registration.finalTuition),
          courses: registration.courses.map((course: any) => ({
            ...course, coursePriceSnapshot: Number(course.coursePriceSnapshot),
          })),
          payments: registration.payments.map((payment: any) => ({
            ...payment, claimedAmount: Number(payment.claimedAmount),
            approvedAmount: payment.approvedAmount === null ? null : Number(payment.approvedAmount),
          })),
          installments, paidTotal, balance: Math.max(0, Number(registration.finalTuition) - paidTotal),
        };
      }),
    };
  }

  async deleteStudent(user: AuthenticatedUser, studentId: string) {
    this.requireAdmin(user);
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, userId: true },
    });
    if (!student) throw new NotFoundException('Student not found');

    // Keep the student's financial, registration, counseling, and audit history.
    // The legacy DELETE endpoint is now a soft-delete for backward compatibility.
    await this.prisma.student.update({
      where: { id: studentId },
      data: { isArchived: true },
    });
    await this.prisma.session.deleteMany({ where: { userId: student.userId } });

    return { success: true, isArchived: true };
  }

  async resetPassword(user: AuthenticatedUser, studentId: string, dto: ResetStudentPasswordDto) {
    this.requireAdmin(user);
    const student = await this.prisma.student.findUnique({ where: { id: studentId }, select: { userId: true } });
    if (!student) throw new NotFoundException('Student not found');
    const passwordHash = await argon2.hash(dto.password);
    await this.prisma.user.update({ where: { id: student.userId }, data: { passwordHash } });
    return { success: true };
  }

  async enroll(user: AuthenticatedUser, studentId: string, courseId: string) {
    this.requireAdmin(user);
    const student = await this.prisma.student.findUnique({ where: { id: studentId }, select: { id: true } });
    if (!student) throw new NotFoundException('Student not found');
    const course = await this.prisma.course.findUnique({ where: { id: courseId }, select: { id: true, price: true } });
    if (!course) throw new NotFoundException('Course not found');
    try {
      return await this.prisma.enrollment.create({
        data: { studentId, courseId, tuitionAmount: course.price },
        include: { course: { select: { id: true, title: true, status: true } } },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') throw new ConflictException('Student is already enrolled in this course');
      throw error;
    }
  }

  async updateEnrollment(user: AuthenticatedUser, enrollmentId: string, status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED') {
    this.requireAdmin(user);
    const enrollment = await this.prisma.enrollment.findUnique({ where: { id: enrollmentId } });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    return this.prisma.enrollment.update({ where: { id: enrollmentId }, data: { status } });
  }

  async myEnrollments(user: AuthenticatedUser) {
    if (user.role !== 'STUDENT' || !user.studentId) throw new ForbiddenException('Student access required');
    return this.prisma.enrollment.findMany({
      where: {
        studentId: user.studentId,
        status: 'ACTIVE',
        course: { status: 'ACTIVE' },
      },
      orderBy: { enrolledAt: 'desc' },
      include: { course: true },
    });
  }
}
