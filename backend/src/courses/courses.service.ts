import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { randomUUID } from 'crypto';
import { createReadStream, existsSync, mkdirSync, unlinkSync, writeFileSync, statSync } from 'fs';
import { basename, extname, join } from 'path';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { CourseStatus } from '@prisma/client';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { CreateFileDto } from './dto/create-file.dto';
const ExcelJS = require('exceljs');
const execFileAsync = promisify(execFile);

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  private requireAdmin(user: AuthenticatedUser) {
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'STAFF') {
      throw new ForbiddenException('Admin access required');
    }
  }


  async exportCourses(user: AuthenticatedUser, res: Response) {
    this.requireAdmin(user);
    const courses = await this.prisma.course.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        enrollments: { select: { status: true } },
        sessions: { select: { id: true } },
        files: { select: { id: true } },
      },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Courses');
    sheet.views = [{ rightToLeft: true }];
    sheet.columns = [
      { header: 'عنوان دوره', key: 'title', width: 30 },
      { header: 'استاد', key: 'professor', width: 22 },
      { header: 'مقطع', key: 'level', width: 14 },
      { header: 'سال تحصیلی', key: 'academicYear', width: 14 },
      { header: 'روزهای کلاس', key: 'classDays', width: 26 },
      { header: 'ساعت شروع', key: 'classStartTime', width: 14 },
      { header: 'ساعت پایان', key: 'classEndTime', width: 14 },
      { header: 'ترم', key: 'term', width: 16 },
      { header: 'دسته‌بندی', key: 'category', width: 18 },
      { header: 'قیمت', key: 'price', width: 16 },
      { header: 'تصویر جلد', key: 'coverImage', width: 34 },
      { header: 'وضعیت', key: 'status', width: 14 },
      { header: 'توضیحات', key: 'description', width: 42 },
      { header: 'هنرجویان فعال', key: 'activeStudents', width: 18 },
      { header: 'کل هنرجویان', key: 'students', width: 16 },
      { header: 'جلسات', key: 'sessions', width: 12 },
      { header: 'فایل‌ها', key: 'files', width: 12 },
    ];

    const dayLabels: Record<string, string> = {
      SATURDAY: 'شنبه', SUNDAY: 'یکشنبه', MONDAY: 'دوشنبه', TUESDAY: 'سه‌شنبه',
      WEDNESDAY: 'چهارشنبه', THURSDAY: 'پنجشنبه', FRIDAY: 'جمعه',
    };

    for (const course of courses) {
      sheet.addRow({
        title: course.title,
        professor: course.professor,
        level: course.level === 'MASTER' ? 'ارشد' : course.level === 'DOCTORATE' ? 'دکتری' : course.level || '',
        academicYear: course.academicYear ?? '',
        classDays: (course.classDays || []).map((day: string) => dayLabels[day] || day).join('، '),
        classStartTime: course.classStartTime || '',
        classEndTime: course.classEndTime || '',
        term: course.term || '',
        category: course.category || '',
        price: course.price ? Number(course.price) : '',
        coverImage: course.coverImage || '',
        status: course.status === 'ACTIVE' ? 'فعال' : course.status === 'ARCHIVED' ? 'بایگانی' : 'پیش‌نویس',
        description: course.description || '',
        activeStudents: course.enrollments.filter((e: any) => e.status === 'ACTIVE').length,
        students: course.enrollments.length,
        sessions: course.sessions.length,
        files: course.files.length,
      });
    }

    const header = sheet.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3F8F8A' } };
    header.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.autoFilter = { from: 'A1', to: 'Q1' };

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', "attachment; filename*=UTF-8''courses.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  }

  async importCourses(user: AuthenticatedUser, file: any) {
    this.requireAdmin(user);
    if (!file?.buffer) throw new BadRequestException('فایل Excel انتخاب نشده است.');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('برگه‌ای برای وارد کردن دوره‌ها پیدا نشد.');

    const normalize = (value: unknown) => String(value ?? '').trim();
    const dayMap: Record<string, string> = {
      'شنبه': 'SATURDAY', 'یکشنبه': 'SUNDAY', 'دوشنبه': 'MONDAY', 'سه‌شنبه': 'TUESDAY',
      'سه شنبه': 'TUESDAY', 'چهارشنبه': 'WEDNESDAY', 'پنجشنبه': 'THURSDAY', 'جمعه': 'FRIDAY',
      'SATURDAY': 'SATURDAY', 'SUNDAY': 'SUNDAY', 'MONDAY': 'MONDAY', 'TUESDAY': 'TUESDAY',
      'WEDNESDAY': 'WEDNESDAY', 'THURSDAY': 'THURSDAY', 'FRIDAY': 'FRIDAY',
    };
    const levelMap: Record<string, string> = {
      'ارشد': 'MASTER', 'master': 'MASTER', 'MASTER': 'MASTER',
      'دکتری': 'DOCTORATE', 'دکترا': 'DOCTORATE', 'doctorate': 'DOCTORATE', 'DOCTORATE': 'DOCTORATE',
    };
    const statusMap: Record<string, CourseStatus> = {
      'فعال': 'ACTIVE', 'ACTIVE': 'ACTIVE', 'بایگانی': 'ARCHIVED', 'ARCHIVED': 'ARCHIVED',
      'پیش‌نویس': 'DRAFT', 'DRAFT': 'DRAFT',
    };
    const headers = new Map<string, number>();
    sheet.getRow(1).eachCell((cell: any, col: number) => headers.set(normalize(cell.value), col));
    const col = (...names: string[]) => names.map(name => headers.get(name)).find(Boolean);
    const value = (row: any, ...names: string[]) => {
      const index = col(...names);
      return index ? normalize(row.getCell(index).value) : '';
    };
    const titleCol = col('عنوان دوره', 'title');
    const professorCol = col('استاد', 'professor');
    if (!titleCol || !professorCol) throw new BadRequestException('ستون‌های «عنوان دوره» و «استاد» در فایل Excel الزامی هستند.');

    let created = 0;
    let skipped = 0;
    const errors: string[] = [];
    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      const title = value(row, 'عنوان دوره', 'title');
      const professor = value(row, 'استاد', 'professor');
      if (!title && !professor) continue;
      if (!title || !professor) { skipped += 1; errors.push(`ردیف ${rowNumber}: عنوان دوره و استاد هر دو لازم هستند.`); continue; }
      const levelRaw = value(row, 'مقطع', 'level');
      const level = levelMap[levelRaw] || (levelRaw ? levelRaw : undefined);
      const academicYearRaw = value(row, 'سال تحصیلی', 'academicYear');
      const academicYear = academicYearRaw ? Number(academicYearRaw) : undefined;
      const daysRaw = value(row, 'روزهای کلاس', 'classDays');
      const classDays = daysRaw.split(/[,،;/|]+/).map(item => dayMap[item.trim()]).filter(Boolean);
      const priceRaw = value(row, 'قیمت', 'price');
      const price = priceRaw ? Number(priceRaw.replace(/,/g, '')) : undefined;
      const statusRaw = value(row, 'وضعیت', 'status');
      const status = statusMap[statusRaw] || 'DRAFT';
      if (academicYearRaw && (!Number.isInteger(academicYear) || academicYear! < 1300)) { skipped += 1; errors.push(`ردیف ${rowNumber}: سال تحصیلی معتبر نیست.`); continue; }
      if (priceRaw && (!Number.isFinite(price) || price! < 0)) { skipped += 1; errors.push(`ردیف ${rowNumber}: قیمت معتبر نیست.`); continue; }
      try {
        await this.prisma.course.create({
          data: {
            title, professor, level,
            description: value(row, 'توضیحات', 'description') || undefined,
            term: value(row, 'ترم', 'term') || undefined,
            category: value(row, 'دسته‌بندی', 'category') || undefined,
            price, coverImage: value(row, 'تصویر جلد', 'coverImage') || undefined, academicYear, classDays,
            classStartTime: value(row, 'ساعت شروع', 'classStartTime') || undefined,
            classEndTime: value(row, 'ساعت پایان', 'classEndTime') || undefined, status,
          },
        });
        created += 1;
      } catch (error: any) { skipped += 1; errors.push(`ردیف ${rowNumber}: ${error?.message || 'ذخیره دوره انجام نشد.'}`); }
    }
    return { created, skipped, errors: errors.slice(0, 30) };
  }
  private publicCourse(course: any) {
    return {
      ...course,
      coverImage: course.coverImageStorageKey
        ? '/api/courses/' + course.id + '/cover'
        : course.coverImage,
      coverImageStorageKey: undefined,
    };
  }

  async listCourses(user: AuthenticatedUser) {
    if (user.role === 'STUDENT') {
      if (!user.studentId) throw new ForbiddenException('Student profile required');
      const courses = await this.prisma.course.findMany({
        where: { status: 'ACTIVE', enrollments: { some: { studentId: user.studentId, status: 'ACTIVE' } } },
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { sessions: true, files: true } } },
      });
      return courses.map(course => this.publicCourse(course));
    }

    const courses = await this.prisma.course.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { enrollments: true, sessions: true, files: true } } },
    });
    return courses.map(course => this.publicCourse(course));
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
      if (course.status !== 'ACTIVE') throw new ForbiddenException('Course is not active');
      if (!enrollment || enrollment.status !== 'ACTIVE') throw new ForbiddenException('Course access denied');
    }
    return this.publicCourse(course);
  }

  async listCourseEnrollments(user: AuthenticatedUser, courseId: string) {
    this.requireAdmin(user);
    await this.ensureCourse(courseId);
    return this.prisma.enrollment.findMany({
      where: { courseId },
      orderBy: { enrolledAt: 'desc' },
      select: {
        id: true,
        status: true,
        enrolledAt: true,
        student: {
          select: {
            id: true,
            fullName: true,
            nationalId: true,
            phone: true,
          },
        },
      },
    });
  }

  async enrollStudentInCourse(user: AuthenticatedUser, courseId: string, studentId: string) {
    this.requireAdmin(user);
    await this.ensureCourse(courseId);
    const student = await this.prisma.student.findUnique({ where: { id: studentId }, select: { id: true } });
    if (!student) throw new NotFoundException('Student not found');
    const course = await this.prisma.course.findUnique({ where: { id: courseId }, select: { id: true, price: true } });
    if (!course) throw new NotFoundException('Course not found');
    try {
      return await this.prisma.enrollment.create({
        data: { courseId, studentId, tuitionAmount: course.price },
        select: {
          id: true,
          status: true,
          enrolledAt: true,
          student: { select: { id: true, fullName: true, nationalId: true, phone: true } },
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') throw new BadRequestException('Student is already enrolled in this course');
      throw error;
    }
  }

  async updateCourseEnrollment(user: AuthenticatedUser, enrollmentId: string, status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED') {
    this.requireAdmin(user);
    const enrollment = await this.prisma.enrollment.findUnique({ where: { id: enrollmentId } });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    return this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status },
      select: {
        id: true,
        status: true,
        enrolledAt: true,
        student: { select: { id: true, fullName: true, nationalId: true, phone: true } },
      },
    });
  }

  async removeCourseEnrollment(user: AuthenticatedUser, enrollmentId: string) {
    this.requireAdmin(user);
    const enrollment = await this.prisma.enrollment.findUnique({ where: { id: enrollmentId } });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    await this.prisma.enrollment.delete({ where: { id: enrollmentId } });
    return { success: true };
  }

  async createCourse(user: AuthenticatedUser, dto: CreateCourseDto) {
    this.requireAdmin(user);
    const course = await this.prisma.course.create({ data: { ...dto, price: dto.price } });
    return this.publicCourse(course);
  }

  async updateCourse(user: AuthenticatedUser, courseId: string, dto: UpdateCourseDto) {
    this.requireAdmin(user);
    await this.ensureCourse(courseId);
    const course = await this.prisma.course.update({
      where: { id: courseId },
      data: { ...dto, ...(dto.coverImage !== undefined ? { coverImageStorageKey: null } : {}) },
    });
    return this.publicCourse(course);
  }

  async deleteCourse(user: AuthenticatedUser, courseId: string) {
    this.requireAdmin(user);
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, coverImageStorageKey: true },
    });
    if (!course) throw new NotFoundException('Course not found');
    const deleted = await this.prisma.course.delete({ where: { id: courseId } });
    if (course.coverImageStorageKey) {
      const storageDirectory = process.env.FILE_STORAGE_PATH || '/opt/shamseh-app/storage/files';
      const coverPath = join(storageDirectory, basename(course.coverImageStorageKey));
      if (existsSync(coverPath)) unlinkSync(coverPath);
    }
    return this.publicCourse(deleted);
  }

  async listSessions(user: AuthenticatedUser, courseId: string) {
    await this.ensureCourseAccess(user, courseId);
    const sessions = await this.prisma.courseSession.findMany({
      where: { courseId },
      orderBy: [{ sessionNumber: 'asc' }],
    });
    return sessions.map((session) => ({
      id: session.id,
      courseId: session.courseId,
      sessionNumber: session.sessionNumber,
      title: `جلسه ${session.sessionNumber}`,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    }));
  }

  async listCourseFiles(user: AuthenticatedUser, courseId: string) {
    await this.ensureCourseAccess(user, courseId);
    const files = await this.prisma.courseFile.findMany({
      where: { courseId },
      orderBy: { createdAt: 'desc' },
    });
    return files.map((file) => this.publicFile(file));
  }

  async uploadCourseCover(user: AuthenticatedUser, courseId: string, file: any) {
    this.requireAdmin(user);
    await this.ensureCourse(courseId);
    if (!file?.buffer) throw new BadRequestException('فایل تصویر انتخاب نشده است.');
    if (!String(file.mimetype || '').startsWith('image/')) throw new BadRequestException('فایل جلد باید تصویر باشد.');

    const storageDirectory = process.env.FILE_STORAGE_PATH || '/opt/shamseh-app/storage/files';
    mkdirSync(storageDirectory, { recursive: true });
    const storageKey = randomUUID() + extname(file.originalname).toLowerCase();
    const filePath = join(storageDirectory, storageKey);
    writeFileSync(filePath, file.buffer);

    const previous = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { coverImageStorageKey: true },
    });
    const course = await this.prisma.course.update({
      where: { id: courseId },
      data: { coverImage: null, coverImageStorageKey: storageKey },
    });

    if (previous?.coverImageStorageKey && previous.coverImageStorageKey !== storageKey) {
      const oldPath = join(storageDirectory, basename(previous.coverImageStorageKey));
      if (existsSync(oldPath)) unlinkSync(oldPath);
    }
    return this.publicCourse(course);
  }

  async viewCourseCover(user: AuthenticatedUser, courseId: string, res: Response) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, coverImageStorageKey: true },
    });
    if (!course?.coverImageStorageKey) throw new NotFoundException('Course cover not found');
    await this.ensureCourseAccess(user, courseId);

    const storageDirectory = process.env.FILE_STORAGE_PATH || '/opt/shamseh-app/storage/files';
    const filePath = join(storageDirectory, basename(course.coverImageStorageKey));
    if (!existsSync(filePath)) throw new NotFoundException('Course cover file not found');
    const extension = extname(filePath).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif',
    };
    res.setHeader('Content-Type', contentTypes[extension] || 'application/octet-stream');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return createReadStream(filePath).pipe(res);
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

  async createUploadedCourseFile(user: AuthenticatedUser, courseId: string, dto: CreateFileDto, file: any) {
    this.requireAdmin(user);
    await this.ensureCourse(courseId);
    return this.createStoredFile(courseId, dto, file);
  }

  private async createStoredFile(
    courseId: string,
    dto: CreateFileDto,
    file: any,
  ) {
    if (!file?.buffer) throw new BadRequestException('File is required');

    const storageDirectory = process.env.FILE_STORAGE_PATH || '/opt/shamseh-app/storage/files';
    mkdirSync(storageDirectory, { recursive: true });

    const storageKey = randomUUID() + extname(file.originalname).toLowerCase();
    const filePath = join(storageDirectory, storageKey);

    console.log('[CourseUpload] writing file:', file.originalname, file.size, '->', filePath);
    writeFileSync(filePath, file.buffer);
    console.log('[CourseUpload] file written:', filePath);

    try {
      const record = await this.prisma.courseFile.create({
        data: {
          courseId,
          title: dto.title,
          type: dto.type,
          storageKey,
          mimeType: file.mimetype,
          fileSize: BigInt(file.size),
          externalUrl: null,
        },
      });
      console.log('[CourseUpload] DB record created:', record.id);
      return this.publicFile(record);
    } catch (error) {
      if (existsSync(filePath)) unlinkSync(filePath);
      throw error;
    }
  }

  async viewFile(user: AuthenticatedUser, fileId: string, res: Response, range?: string) {
    console.log('[FileViewer] request:', fileId, user.role, user.studentId ?? 'no-student');
    const file = await this.prisma.courseFile.findUnique({ where: { id: fileId } });
    if (!file) {
      console.error('[FileViewer] file not found:', fileId);
      throw new NotFoundException('File not found');
    }
    await this.ensureCourseAccess(user, file.courseId);

    if (file.externalUrl) return res.redirect(file.externalUrl);
    if (!file.storageKey) throw new NotFoundException('Stored file not found');

    const storageDirectory = process.env.FILE_STORAGE_PATH || '/opt/shamseh-app/storage/files';
    const sourcePath = join(storageDirectory, basename(file.storageKey));
    if (!existsSync(sourcePath)) {
      console.error('[FileViewer] stored file missing:', sourcePath);
      throw new NotFoundException('Stored file not found');
    }

    const extension = extname(file.storageKey).toLowerCase();
    let contentType = file.mimeType || 'application/octet-stream';
    if (extension === '.mp3') contentType = 'audio/mpeg';
    else if (extension === '.wav') contentType = 'audio/wav';
    else if (extension === '.ogg' || extension === '.oga') contentType = 'audio/ogg';
    else if (extension === '.mp4') contentType = 'video/mp4';
    else if (extension === '.webm') contentType = 'video/webm';
    const officeExtensions = new Set(['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp']);
    let viewPath = sourcePath;
    if (officeExtensions.has(extension)) {
      const cacheDirectory = join(storageDirectory, '.viewer-cache');
      mkdirSync(cacheDirectory, { recursive: true });
      const cachedPath = join(cacheDirectory, `${basename(file.storageKey, extension)}.pdf`);

      if (!existsSync(cachedPath)) {
        await execFileAsync('/usr/bin/libreoffice', [
          '--headless',
          '--convert-to', 'pdf',
          '--outdir', cacheDirectory,
          sourcePath,
        ], { timeout: 120000 });

        const generatedPath = join(cacheDirectory, `${basename(file.storageKey, extension)}.pdf`);
        if (!existsSync(generatedPath)) {
          throw new BadRequestException('تبدیل فایل برای نمایش انجام نشد.');
        }
      }

      viewPath = cachedPath;
      contentType = 'application/pdf';
    }

    console.log('[FileViewer] serving:', viewPath, contentType);

    const isStreamableMedia = contentType.startsWith('audio/') || contentType.startsWith('video/');
    const fileSize = statSync(viewPath).size;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (isStreamableMedia) {
      res.setHeader('Accept-Ranges', 'bytes');
      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (match) {
          const start = match[1] ? Number(match[1]) : Math.max(fileSize - Number(match[2]), 0);
          const end = match[2] ? Number(match[2]) : fileSize - 1;
          if (start <= end && start < fileSize) {
            const safeEnd = Math.min(end, fileSize - 1);
            res.status(206);
            res.setHeader('Content-Range', `bytes ${start}-${safeEnd}/${fileSize}`);
            res.setHeader('Content-Length', safeEnd - start + 1);
            return createReadStream(viewPath, { start, end: safeEnd }).pipe(res);
          }
        }
      }
      res.setHeader('Content-Length', fileSize);
    }

    return createReadStream(viewPath).pipe(res);
  }

  async streamFile(user: AuthenticatedUser, fileId: string, res: Response) {
    const file = await this.prisma.courseFile.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundException('File not found');
    await this.ensureCourseAccess(user, file.courseId);

    if (file.externalUrl) return res.redirect(file.externalUrl);
    if (!file.storageKey) throw new NotFoundException('Stored file not found');

    const storageDirectory = process.env.FILE_STORAGE_PATH || '/opt/shamseh-app/storage/files';
    const filePath = join(storageDirectory, basename(file.storageKey));
    if (!existsSync(filePath)) throw new NotFoundException('Stored file not found');

    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.title)}`);
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
    title: string;
    type: 'PDF' | 'POWERPOINT' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'LINK';
    mimeType: string | null;
    fileSize: bigint | null;
    externalUrl: string | null;
    storageKey: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: file.id,
      courseId: file.courseId,
      title: file.title,
      type: file.type,
      mimeType: file.mimeType,
      fileSize: file.fileSize?.toString() ?? null,
      externalUrl: file.externalUrl,
      streamUrl: file.storageKey ? `/api/files/${file.id}/stream` : null,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    };
  }

  async createSession(user: AuthenticatedUser, courseId: string, dto: CreateSessionDto) {
    this.requireAdmin(user);
    await this.ensureCourse(courseId);
    try {
      return await this.prisma.courseSession.create({
        data: { courseId, sessionNumber: dto.sessionNumber },
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
      data: { sessionNumber: dto.sessionNumber },
    });
  }

  async deleteSession(user: AuthenticatedUser, sessionId: string) {
    this.requireAdmin(user);
    const session = await this.prisma.courseSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');
    return this.prisma.courseSession.delete({ where: { id: sessionId } });
  }

  private async ensureCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId }, select: { id: true, status: true } });
    if (!course) throw new NotFoundException('Course not found');
  }

  private async ensureCourseAccess(user: AuthenticatedUser, courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, status: true },
    });
    if (!course) throw new NotFoundException('Course not found');

    if (user.role === 'STUDENT') {
      if (!user.studentId) throw new ForbiddenException('Student profile required');
      if (course.status !== 'ACTIVE') throw new ForbiddenException('Course is not active');
      const enrollment = await this.prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: user.studentId, courseId } },
      });
      if (!enrollment || enrollment.status !== 'ACTIVE') throw new ForbiddenException('Course access denied');
    }
  }
}
