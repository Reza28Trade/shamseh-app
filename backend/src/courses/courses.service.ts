import { BadRequestException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Response } from 'express';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { randomBytes, randomUUID } from 'crypto';
import { createReadStream, existsSync, mkdirSync, unlinkSync, writeFileSync, statSync, rmSync } from 'fs';
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
  private readonly hlsBuilds = new Map<string, Promise<void>>();

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
    let updated = 0;
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
      const startDate = value(row, 'تاریخ شروع', 'startDate') || undefined;
      const schedule = value(row, 'برنامه کلاس', 'schedule') || undefined;
      const term = value(row, 'ترم', 'term') || undefined;
      const category = value(row, 'دسته‌بندی', 'category') || undefined;
      const description = value(row, 'توضیحات', 'description') || undefined;
      const classStartTime = value(row, 'ساعت شروع', 'classStartTime') || undefined;
      const classEndTime = value(row, 'ساعت پایان', 'classEndTime') || undefined;
      const data = {
        title, professor, level,
        description, term, category, startDate, schedule,
        price, coverImage: value(row, 'تصویر جلد', 'coverImage') || undefined,
        academicYear, classDays, classStartTime, classEndTime, status,
      };
      try {
        // Match the full class identity so parallel sessions of the same subject remain separate.
        const existing = await this.prisma.course.findFirst({
          where: {
            title, professor,
            level: level ?? null,
            term: term ?? null,
            startDate: startDate ?? null,
            schedule: schedule ?? null,
            classStartTime: classStartTime ?? null,
            classEndTime: classEndTime ?? null,
            classDays: { equals: classDays },
          },
          select: { id: true },
        });
        if (existing) {
          await this.prisma.course.update({ where: { id: existing.id }, data });
          updated += 1;
        } else {
          await this.prisma.course.create({ data });
          created += 1;
        }
      } catch (error: any) { skipped += 1; errors.push(`ردیف ${rowNumber}: ${error?.message || 'ذخیره دوره انجام نشد.'}`); }
    }
    return { created, updated, skipped, errors: errors.slice(0, 30) };
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

  /** Record successful protected-content access without blocking delivery if audit storage fails. */
  private async logProtectedContentAccess(
    user: AuthenticatedUser,
    file: { id: string; courseId: string; title: string },
    route: 'view' | 'stream' | 'hls',
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: user.id,
          action: 'COURSE_CONTENT_ACCESS',
          entityType: 'CourseFile',
          entityId: file.id,
          metadata: { courseId: file.courseId, fileTitle: file.title, route, role: user.role },
        },
      });
    } catch (error) {
      // Content delivery should remain available if audit logging is temporarily unavailable.
      console.error('[CourseContentAudit] failed to record access', error);
    }
  }

  /** Apply conservative cache/security headers to protected course files. */
  private setProtectedFileHeaders(res: Response) {
    // Course content is account-protected; shared browser/proxy caches must not retain it.
    res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
  }

  async viewFile(user: AuthenticatedUser, fileId: string, res: Response, range?: string) {
    console.log('[FileViewer] request:', fileId, user.role, user.studentId ?? 'no-student');
    const file = await this.prisma.courseFile.findUnique({ where: { id: fileId } });
    if (!file) {
      console.error('[FileViewer] file not found:', fileId);
      throw new NotFoundException('File not found');
    }
    await this.ensureCourseAccess(user, file.courseId);
    this.setProtectedFileHeaders(res);
    // Log the initial media request, not every Range request generated while seeking.
    if (!range || /^bytes=0-/.test(range)) {
      await this.logProtectedContentAccess(user, file, 'view');
    }

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
    // PDF.js can request byte ranges while rendering a document page-by-page.
    // This reduces eager transfer in supported PDFs; it is not DRM and does not
    // prevent an authorized user from retrieving the underlying bytes.
    const supportsRanges = isStreamableMedia || contentType === 'application/pdf';
    const fileSize = statSync(viewPath).size;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (supportsRanges) {
      res.setHeader('Accept-Ranges', 'bytes');
      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        if (match) {
          const start = match[1] ? Number(match[1]) : Math.max(fileSize - Number(match[2]), 0);
          const end = match[2] ? Number(match[2]) : fileSize - 1;
          if (Number.isSafeInteger(start) && Number.isSafeInteger(end) && start <= end && start < fileSize) {
            const safeEnd = Math.min(end, fileSize - 1);
            res.status(206);
            res.setHeader('Content-Range', `bytes ${start}-${safeEnd}/${fileSize}`);
            res.setHeader('Content-Length', safeEnd - start + 1);
            return createReadStream(viewPath, { start, end: safeEnd }).pipe(res);
          }
        }
        res.status(416);
        res.setHeader('Content-Range', `bytes */${fileSize}`);
        return res.end();
      }
      res.setHeader('Content-Length', fileSize);
    }

    return createReadStream(viewPath).pipe(res);
  }

  private async generateHlsPlaylist(sourcePath: string, cacheDirectory: string, playlistPath: string, fileId: string) {
    const ffmpegPath = process.env.FFMPEG_PATH || '/usr/bin/ffmpeg';
    if (!existsSync(ffmpegPath)) {
      throw new ServiceUnavailableException('پخش محافظت‌شدهٔ ویدئو هنوز روی این سرور آماده نشده است.');
    }

    mkdirSync(cacheDirectory, { recursive: true, mode: 0o700 });
    const keyPath = join(cacheDirectory, 'hls.key');
    const keyInfoPath = join(cacheDirectory, 'keyinfo');
    try {
      writeFileSync(keyPath, randomBytes(16), { mode: 0o600 });
      writeFileSync(keyInfoPath, `key.bin\n${keyPath}\n`, { mode: 0o600 });
      await execFileAsync(ffmpegPath, [
        '-hide_banner', '-loglevel', 'error', '-y',
        '-i', sourcePath,
        '-map', '0:v:0',
        '-map', '0:a:0?',
        '-vf', "scale=w='min(1280,iw)':h=-2",
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '25',
        '-c:a', 'aac', '-b:a', '96k', '-ac', '2',
        '-f', 'hls', '-hls_time', '6', '-hls_playlist_type', 'vod',
        '-hls_flags', 'independent_segments',
        '-hls_key_info_file', keyInfoPath,
        '-hls_segment_filename', join(cacheDirectory, 'segment-%05d.ts'),
        playlistPath,
      ], { timeout: 600000, maxBuffer: 2 * 1024 * 1024 });
      if (existsSync(keyInfoPath)) unlinkSync(keyInfoPath);
    } catch (error) {
      rmSync(cacheDirectory, { recursive: true, force: true });
      console.error('[ProtectedHLS] video conversion failed for file', fileId, error);
      throw new ServiceUnavailableException('آماده‌سازی ویدئو ناموفق بود. لطفاً بعداً دوباره تلاش کنید.');
    }
    if (!existsSync(playlistPath)) {
      rmSync(cacheDirectory, { recursive: true, force: true });
      throw new ServiceUnavailableException('فایل پخش ویدئو ساخته نشد.');
    }
  }

  /**
   * Serve an authenticated HLS playlist or segment. The generated cache lives
   * under the private file-storage directory and is never exposed as static files.
   * HLS improves delivery and raises the effort required to bulk-save content; it
   * is not DRM and cannot stop an authorized viewer from recording/reconstructing it.
   */
  async hlsAsset(user: AuthenticatedUser, fileId: string, assetName: string, res: Response) {
    if (assetName !== 'index.m3u8' && assetName !== 'key.bin' && !/^segment-\d{5}\.ts$/.test(assetName)) {
      throw new NotFoundException('HLS asset not found');
    }

    const file = await this.prisma.courseFile.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundException('File not found');
    await this.ensureCourseAccess(user, file.courseId);
    this.setProtectedFileHeaders(res);

    if (file.externalUrl || !file.storageKey) {
      throw new BadRequestException('این فایل ویدئویی داخلی برای پخش محافظت‌شده نیست.');
    }

    const storageDirectory = process.env.FILE_STORAGE_PATH || '/opt/shamseh-app/storage/files';
    const sourcePath = join(storageDirectory, basename(file.storageKey));
    if (!existsSync(sourcePath)) throw new NotFoundException('Stored file not found');
    const extension = extname(file.storageKey).toLowerCase();
    const videoExtensions = new Set(['.mp4', '.m4v', '.mov', '.webm', '.mkv', '.avi', '.mpeg', '.mpg']);
    if (!String(file.mimeType || '').startsWith('video/') && !videoExtensions.has(extension)) {
      throw new BadRequestException('این فایل ویدئو نیست.');
    }

    const cacheDirectory = join(storageDirectory, '.hls-cache', file.id);
    const playlistPath = join(cacheDirectory, 'index.m3u8');
    if (assetName === 'index.m3u8') await this.logProtectedContentAccess(user, file, 'hls');
    if (!existsSync(playlistPath)) {
      let build = this.hlsBuilds.get(file.id);
      if (!build) {
        build = this.generateHlsPlaylist(sourcePath, cacheDirectory, playlistPath, file.id);
        this.hlsBuilds.set(file.id, build);
      }
      try {
        await build;
      } finally {
        if (this.hlsBuilds.get(file.id) === build) this.hlsBuilds.delete(file.id);
      }
    }

    const assetPath = join(cacheDirectory, assetName === 'key.bin' ? 'hls.key' : assetName);
    if (!existsSync(assetPath)) throw new NotFoundException('HLS asset not found');
    res.setHeader('Content-Type', assetName === 'index.m3u8' ? 'application/vnd.apple.mpegurl' : assetName === 'key.bin' ? 'application/octet-stream' : 'video/mp2t');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Accel-Buffering', 'no');
    return createReadStream(assetPath).pipe(res);
  }

  async streamFile(user: AuthenticatedUser, fileId: string, res: Response) {
    const file = await this.prisma.courseFile.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundException('File not found');
    await this.ensureCourseAccess(user, file.courseId);
    this.setProtectedFileHeaders(res);
    await this.logProtectedContentAccess(user, file, 'stream');

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
    const storageDirectory = process.env.FILE_STORAGE_PATH || '/opt/shamseh-app/storage/files';
    if (file.storageKey) {
      const filePath = join(storageDirectory, basename(file.storageKey));
      if (existsSync(filePath)) unlinkSync(filePath);
    }
    // Remove private generated derivatives when an admin deletes the source file.
    rmSync(join(storageDirectory, '.hls-cache', file.id), { recursive: true, force: true });
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
