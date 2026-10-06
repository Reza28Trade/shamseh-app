import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { CreateStudentDto } from './dto/create-student.dto';

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

  async createStudent(user: AuthenticatedUser, dto: CreateStudentDto) {
    this.requireAdmin(user);
    const passwordHash = await argon2.hash(dto.password);
    try {
      return await this.prisma.user.create({
        data: {
          username: dto.username,
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

  async enroll(user: AuthenticatedUser, studentId: string, courseId: string) {
    this.requireAdmin(user);
    const student = await this.prisma.student.findUnique({ where: { id: studentId }, select: { id: true } });
    if (!student) throw new NotFoundException('Student not found');
    const course = await this.prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
    if (!course) throw new NotFoundException('Course not found');
    try {
      return await this.prisma.enrollment.create({
        data: { studentId, courseId },
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
