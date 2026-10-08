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
        id: true, fullName: true, nationalId: true, phone: true,
        user: { select: { id: true, username: true, status: true, createdAt: true } },
        enrollments: {
          select: { id: true, status: true, courseId: true, enrolledAt: true, course: { select: { id: true, title: true } } },
        },
      },
    });
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
            create: { fullName: dto.fullName, nationalId: dto.nationalId, phone: dto.phone },
          },
        },
        select: {
          id: true, username: true, role: true, status: true,
          student: { select: { id: true, fullName: true, nationalId: true, phone: true } },
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
      select: { id: true, userId: true, nationalId: true, phone: true },
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
          },
          select: {
            id: true,
            fullName: true,
            nationalId: true,
            phone: true,
          },
        });

        if (dto.courseIds !== undefined) {
          await tx.enrollment.deleteMany({ where: { studentId } });
          if (dto.courseIds.length > 0) {
            const coursePrices = await tx.course.findMany({
              where: { id: { in: dto.courseIds } },
              select: { id: true, price: true },
            });
            await tx.enrollment.createMany({
              data: dto.courseIds.map((courseId) => ({
                studentId,
                courseId,
                tuitionAmount: coursePrices.find((course) => course.id === courseId)?.price ?? null,
              })),
              skipDuplicates: true,
            });
          }
        }

        return updated;
      });
    } catch (error: any) {
      if (error?.code === 'P2002') throw new ConflictException('Username or national ID already exists');
      throw error;
    }
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
      where: { studentId: user.studentId, status: 'ACTIVE' },
      orderBy: { enrolledAt: 'desc' },
      include: { course: true },
    });
  }
}
