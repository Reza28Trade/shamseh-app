import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { createReadStream, existsSync } from 'fs';
import { basename, extname, join } from 'path';
import { Response } from 'express';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { CreateAnalysisDto } from './dto/create-analysis.dto';
import { SaveRulesDto } from './dto/save-rules.dto';
import { UpdateAnalysisDto } from './dto/update-analysis.dto';

@Injectable()
export class PublicContentService {
  constructor(private readonly prisma: PrismaService) {}

  private requireAdmin(user: AuthenticatedUser) {
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'STAFF') {
      throw new ForbiddenException('Admin access required');
    }
  }

  listPublicCourses() {
    return this.prisma.course.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, title: true, professor: true, level: true, description: true,
        term: true, category: true, startDate: true, schedule: true, price: true, coverImage: true, status: true,
        academicYear: true, classDays: true, classStartTime: true, classEndTime: true,
      },
    });
  }

  async streamPublicCourseCover(courseId: string, res: Response) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, status: 'ACTIVE' },
      select: { coverImage: true, coverImageStorageKey: true },
    });
    if (!course) throw new NotFoundException('Course not found');

    // Legacy URL-based covers remain supported.
    if (course.coverImage) return res.redirect(course.coverImage);
    if (!course.coverImageStorageKey) throw new NotFoundException('Course cover not found');

    const storageDirectory = process.env.FILE_STORAGE_PATH || '/opt/shamseh-app/storage/files';
    const filePath = join(storageDirectory, basename(course.coverImageStorageKey));
    if (!existsSync(filePath)) throw new NotFoundException('Course cover file not found');

    const extension = extname(filePath).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.avif': 'image/avif',
    };
    res.setHeader('Content-Type', contentTypes[extension] || 'application/octet-stream');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return createReadStream(filePath).pipe(res);
  }

  async getPublicRules() {
    const rules = await this.prisma.publicContent.findUnique({ where: { slug: 'rules' } });
    return rules ?? {
      id: null,
      type: 'RULES',
      slug: 'rules',
      title: 'قوانین و مقررات آموزشی',
      subtitle: null,
      content: 'قوانین و مقررات در حال آماده‌سازی است.',
      published: true,
      updatedAt: null,
    };
  }

  listPublishedAnalyses(filters: { year?: string; level?: string }) {
    return this.prisma.publicContent.findMany({
      where: {
        type: 'EXAM_ANALYSIS',
        published: true,
        ...(filters.year ? { examYear: filters.year } : {}),
        ...(filters.level ? { examLevel: filters.level } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { examYear: 'desc' }, { updatedAt: 'desc' }],
      select: {
        id: true, title: true, subtitle: true, content: true, examYear: true,
        examLevel: true, resourceUrl: true, updatedAt: true,
      },
    });
  }

  listAdminContent(user: AuthenticatedUser) {
    this.requireAdmin(user);
    return this.prisma.publicContent.findMany({
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });
  }

  saveRules(user: AuthenticatedUser, dto: SaveRulesDto) {
    this.requireAdmin(user);
    return this.prisma.publicContent.upsert({
      where: { slug: 'rules' },
      update: { title: dto.title, content: dto.content, updatedById: user.id, published: true },
      create: {
        type: 'RULES', slug: 'rules', title: dto.title, content: dto.content,
        published: true, updatedById: user.id,
      },
    });
  }

  createAnalysis(user: AuthenticatedUser, dto: CreateAnalysisDto) {
    this.requireAdmin(user);
    return this.prisma.publicContent.create({
      data: {
        type: 'EXAM_ANALYSIS',
        slug: `analysis-${randomUUID()}`,
        title: dto.title,
        subtitle: dto.subtitle,
        content: dto.content,
        examYear: dto.examYear,
        examLevel: dto.examLevel,
        resourceUrl: dto.resourceUrl,
        published: dto.published ?? false,
        sortOrder: dto.sortOrder ?? 0,
        updatedById: user.id,
      },
    });
  }

  async updateAnalysis(user: AuthenticatedUser, id: string, dto: UpdateAnalysisDto) {
    this.requireAdmin(user);
    const existing = await this.prisma.publicContent.findFirst({ where: { id, type: 'EXAM_ANALYSIS' }, select: { id: true } });
    if (!existing) throw new NotFoundException('Analysis not found');
    return this.prisma.publicContent.update({
      where: { id },
      data: { ...dto, updatedById: user.id },
    });
  }

  async deleteAnalysis(user: AuthenticatedUser, id: string) {
    this.requireAdmin(user);
    const existing = await this.prisma.publicContent.findFirst({ where: { id, type: 'EXAM_ANALYSIS' }, select: { id: true } });
    if (!existing) throw new NotFoundException('Analysis not found');
    await this.prisma.publicContent.delete({ where: { id } });
    return { success: true };
  }
}
