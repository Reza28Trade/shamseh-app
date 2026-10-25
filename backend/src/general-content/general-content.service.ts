import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'fs';
import { basename, extname, join } from 'path';
import { randomUUID } from 'crypto';
import { Response } from 'express';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';

const RULES_KEY = 'rules';
const NEWS_KEY = 'education-news';
const DEFAULT_NEWS = JSON.stringify([
  { id: 'welcome', title: 'به بخش اخبار و اطلاعات آموزشی شمسه خوش آمدید', summary: 'اطلاعیه‌ها و خبرهای آموزشی آکادمی در این بخش منتشر می‌شوند.', imageUrl: '', category: 'اطلاعیه', date: '', published: true },
], null, 2);

const DEFAULT_RULES = '۱. حضور به موقع در کلاس‌های آنلاین الزامی است.\n۲. انتشار محتوای دوره‌ها پیگرد قانونی دارد.';

@Injectable()
export class GeneralContentService {
  constructor(private readonly prisma: PrismaService) {}

  private assertNewsEditor(user: AuthenticatedUser) {
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'STAFF') throw new ForbiddenException('برای مدیریت اخبار دسترسی ندارید.');
  }

  async saveNewsImage(user: AuthenticatedUser, file: any) {
    this.assertNewsEditor(user);
    const allowed: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
    const extension = allowed[String(file?.mimetype || '')];
    if (!file?.buffer || !extension) throw new BadRequestException('فرمت تصویر باید JPG، PNG، WEBP یا GIF باشد.');
    if (file.size > 5 * 1024 * 1024) throw new BadRequestException('حجم تصویر باید کمتر از ۵ مگابایت باشد.');
    const directory = join(process.env.FILE_STORAGE_PATH || '/opt/shamseh-app/storage/files', 'news-images');
    mkdirSync(directory, { recursive: true });
    const filename = `${randomUUID()}${extension}`;
    writeFileSync(join(directory, filename), file.buffer, { flag: 'wx' });
    return { imageUrl: `/api/content/news/images/${filename}` };
  }

  getNewsImage(filename: string, res: Response) {
    const safeName = basename(filename);
    if (safeName !== filename || !/^[a-f0-9-]+\\.(jpg|png|webp|gif)$/i.test(safeName)) throw new NotFoundException('تصویر پیدا نشد.');
    const filePath = join(process.env.FILE_STORAGE_PATH || '/opt/shamseh-app/storage/files', 'news-images', safeName);
    if (!existsSync(filePath)) throw new NotFoundException('تصویر پیدا نشد.');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return createReadStream(filePath).pipe(res);
  }

  async getNews() {
    const item = await this.prisma.generalContent.findUnique({ where: { key: NEWS_KEY } });
    try {
      const parsed = JSON.parse(item?.content ?? DEFAULT_NEWS);
      return Array.isArray(parsed) ? parsed.filter((news) => news && news.published !== false) : [];
    } catch {
      return [];
    }
  }

  async getAdminNews(user: AuthenticatedUser) {
    this.assertNewsEditor(user);
    const item = await this.prisma.generalContent.findUnique({ where: { key: NEWS_KEY } });
    try {
      const parsed = JSON.parse(item?.content ?? DEFAULT_NEWS);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async updateNews(user: AuthenticatedUser, content: string) {
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'STAFF') {
      throw new Error('Admin access required');
    }
    let parsed: unknown;
    try { parsed = JSON.parse(content); } catch { throw new BadRequestException('اطلاعات خبرها معتبر نیست.'); }
    if (!Array.isArray(parsed)) throw new BadRequestException('ساختار خبرها معتبر نیست.');
    for (const item of parsed) {
      if (!item || typeof item.title !== 'string' || typeof item.summary !== 'string') {
        throw new BadRequestException('هر خبر باید عنوان و خلاصه داشته باشد.');
      }
    }
    return this.prisma.generalContent.upsert({
      where: { key: NEWS_KEY },
      create: { key: NEWS_KEY, title: 'اخبار و اطلاعیه‌های آموزشی', content: JSON.stringify(parsed), updatedById: user.id },
      update: { content: JSON.stringify(parsed), updatedById: user.id },
    });
  }

  async getRules() {
    const content = await this.prisma.generalContent.findUnique({ where: { key: RULES_KEY } });
    return { key: RULES_KEY, title: content?.title ?? 'قوانین و مقررات آموزشی', content: content?.content ?? DEFAULT_RULES };
  }

  async updateRules(user: AuthenticatedUser, content: string) {
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'STAFF') {
      throw new Error('Admin access required');
    }
    const value = content.trim();
    if (!value) throw new Error('Rules content cannot be empty');

    return this.prisma.generalContent.upsert({
      where: { key: RULES_KEY },
      create: { key: RULES_KEY, title: 'قوانین و مقررات آموزشی', content: value, updatedById: user.id },
      update: { content: value, updatedById: user.id },
    });
  }
}
