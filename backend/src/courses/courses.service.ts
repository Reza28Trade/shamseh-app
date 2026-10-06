import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { createReadStream, existsSync, unlinkSync } from 'fs';
import { basename, join } from 'path';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { CreateFileDto } from './dto/create-file.dto';

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

  async listCourseFiles(user: AuthenticatedUser, courseId: string) {
    await this.ensureCourseAccess(user, courseId);
    const files = await this.prisma.courseFile.findMany({
      where: { courseId, sessionId: null },
      orderBy: { createdAt: 'desc' },
    });
    return files.map((file) => this.publicFile(file));
  }

  async listSessionFiles(user: AuthenticatedUser, sessionId: string) {
    const session = await this.prisma.courseSession.findUnique({
      where: { id: sessionId },
      select: { id: true, courseId: true },
    });
    if (!session) throw new NotFoundException('Session not found');

    await this.ensureCourseAccess(user, session.courseId);
    const files = await this.prisma.courseFile.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    });
    return files.map((file) => this.publicFile(file));
  }

  async createCourseFile(user: AuthenticatedUser, courseId: string, dto: CreateFileDto) {
    this.requireAdmin(user);
    await this.ensureCourse(courseId);

    const file = await this.prisma.courseFile.create({
      data: {
        courseId,
        title: dto.title,
        type: dto.type,
        storageKey: dto.storageKey,
        mimeType: dto.mimeType,
        fileSize: dto.fileSize === undefined ? undefined : BigInt(dto.fileSize),
        externalUrl: dto.externalUrl,
      },
    });

    return this.publicFile(file);
  }

  async createSessionFile(user: AuthenticatedUser, sessionId: string, dto: CreateFileDto) {
    this.requireAdmin(user);
    const session = await this.prisma.courseSession.findUnique({
      where: { id: sessionId },
      select: { id: true, courseId: true },
    });
    if (!session) throw new NotFoundException('Session not found');

    const file = await this.prisma.courseFile.create({
      data: {
        courseId: session.courseId,
        sessionId,
        title: dto.title,
        type: dto.type,
        storageKey: dto.storageKey,
        mimeType: dto.mimeType,
        fileSize: dto.fileSize === undefined ? undefined : BigInt(dto.fileSize),
        externalUrl: dto.externalUrl,
      },
    });

    return this.publicFile(file);
  }

  async createUploadedCourseFile(user: AuthenticatedUser, courseId: string, dto: CreateFileDto, file: any) {
    this.requireAdmin(user);
    await this.ensureCourse(courseId);
    return this.createStoredFile(courseId, null, dto, file);
  }

  async createUploadedSessionFile(user: AuthenticatedUser, sessionId: string, dto: CreateFileDto, file: Express.Multer.File) {
    this.requireAdmin(user);
    const session = await this.prisma.courseSession.findUnique({
      where: { id: sessionId },
      select: { id: true, courseId: true },
    });
    if (!session) throw new NotFoundException('Session not found');
    return this.createStoredFile(session.courseId, sessionId, dto, file);
  }

  private async createStoredFile(
    courseId: string,
    sessionId: string | null,
    dto: CreateFileDto,
    file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File is required');
    const record = await this.prisma.courseFile.create({
      data: {
        courseId,
        sessionId,
        title: dto.title,
        type: dto.type,
        storageKey: file.filename,
        mimeType: file.mimetype,
        fileSize: BigInt(file.size),
        externalUrl: null,
      },
    });
    return this.publicFile(record);
  }

  async downloadFile(user: AuthenticatedUser, fileId: string, res: Response) {
    const file = await this.prisma.courseFile.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundException('File not found');
    await this.ensureCourseAccess(user, file.courseId);

    if (file.externalUrl) return res.redirect(file.externalUrl);
    if (!file.storageKey) throw new NotFoundException('Stored file not found');

    const storageDirectory = process.env.FILE_STORAGE_PATH || '/opt/shamseh-app/storage/files';
    const filePath = join(storageDirectory, basename(file.storageKey));
    if (!existsSync(filePath)) throw new NotFoundException('Stored file not found');

    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.title)}`);
    return createReadStream(filePath).pipe(res);
  }

  async deleteFile(user: AuthenticatedUser, fileId: string) {
    this.requireAdmin(user);
    const file = await this.prisma.courseFile.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundException('File not found');

    await this.prisma.courseFile.delete({ where: { id: fileId } });
    if (file.storageKey) {
      const storageDirectory = process.env.FILE_STORAGE_PATH || '/opt/shamseh-app/storage/files';
      const filePath = join(storageDirectory, basename(file.storageKey));
      if (existsSync(filePath)) unlinkSync(filePath);
    }
    return { success: true };
  }

  private publicFile(file: {
    id: string;
    courseId: string;
    sessionId: string | null;
    title: string;
    type: 'PDF' | 'POWERPOINT' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'LINK';
    mimeType: string | null;
    fileSize: bigint | null;
    externalUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: file.id,
      courseId: file.courseId,
      sessionId: file.sessionId,
      title: file.title,
      type: file.type,
      mimeType: file.mimeType,
      fileSize: file.fileSize?.toString() ?? null,
      externalUrl: file.externalUrl,
      downloadUrl: file.storageKey ? `/api/files/${file.id}/download` : null,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    };
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
