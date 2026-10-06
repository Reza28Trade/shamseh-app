import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  private requireAdmin(user: AuthenticatedUser) {
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'STAFF') {
      throw new ForbiddenException('Admin access required');
    }
  }

  async listCourses(user: AuthenticatedUser) {
    if (user.role === 'STUDENT') {
      if (!user.studentId) throw new ForbiddenException('Student profile required');
      return this.prisma.course.findMany({
        where: { status: 'ACTIVE', enrollments: { some: { studentId: user.studentId, status: 'ACTIVE' } } },
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { sessions: true, files: true } } },
      });
    }

    return this.prisma.course.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { enrollments: true, sessions: true, files: true } } },
    });
  }

  async getCourse(user: AuthenticatedUser, courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { _count: { select: { enrollments: true, sessions: true, files: true } } },
    });
    if (!course) throw new NotFoundException('Course not found');

    if (user.role === 'STUDENT') {
      if (!user.studentId) throw new ForbiddenException('Student profile required');
      const enrollment = await this.prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: user.studentId, courseId } },
      });
      if (!enrollment || enrollment.status !== 'ACTIVE') throw new ForbiddenException('Course access denied');
    }
    return course;
  }

  async createCourse(user: AuthenticatedUser, dto: CreateCourseDto) {
    this.requireAdmin(user);
    return this.prisma.course.create({ data: { ...dto, price: dto.price } });
  }

  async updateCourse(user: AuthenticatedUser, courseId: string, dto: UpdateCourseDto) {
    this.requireAdmin(user);
    await this.ensureCourse(courseId);
    return this.prisma.course.update({ where: { id: courseId }, data: dto });
  }

  async deleteCourse(user: AuthenticatedUser, courseId: string) {
    this.requireAdmin(user);
    await this.ensureCourse(courseId);
    return this.prisma.course.delete({ where: { id: courseId } });
  }

  async listSessions(user: AuthenticatedUser, courseId: string) {
    await this.ensureCourseAccess(user, courseId);
    return this.prisma.courseSession.findMany({
      where: { courseId },
      orderBy: [{ sessionNumber: 'asc' }],
      include: { _count: { select: { files: true } } },
    });
  }

  async createSession(user: AuthenticatedUser, courseId: string, dto: CreateSessionDto) {
    this.requireAdmin(user);
    await this.ensureCourse(courseId);
    try {
      return await this.prisma.courseSession.create({
        data: { courseId, ...dto, sessionDate: new Date(dto.sessionDate) },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') throw new BadRequestException('Session number already exists for this course');
      throw error;
    }
  }

  async updateSession(user: AuthenticatedUser, sessionId: string, dto: UpdateSessionDto) {
    this.requireAdmin(user);
    const session = await this.prisma.courseSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    return this.prisma.courseSession.update({
      where: { id: sessionId },
      data: { ...dto, sessionDate: dto.sessionDate ? new Date(dto.sessionDate) : undefined },
    });
  }

  async deleteSession(user: AuthenticatedUser, sessionId: string) {
    this.requireAdmin(user);
    const session = await this.prisma.courseSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    return this.prisma.courseSession.delete({ where: { id: sessionId } });
  }

  private async ensureCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
    if (!course) throw new NotFoundException('Course not found');
  }

  private async ensureCourseAccess(user: AuthenticatedUser, courseId: string) {
    await this.ensureCourse(courseId);
    if (user.role === 'STUDENT') {
      if (!user.studentId) throw new ForbiddenException('Student profile required');
      const enrollment = await this.prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: user.studentId, courseId } },
      });
      if (!enrollment || enrollment.status !== 'ACTIVE') throw new ForbiddenException('Course access denied');
    }
  }
}
