import { Injectable } from '@nestjs/common';
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

  async getNews() {
    const item = await this.prisma.generalContent.findUnique({ where: { key: NEWS_KEY } });
    try {
      const parsed = JSON.parse(item?.content ?? DEFAULT_NEWS);
      return Array.isArray(parsed) ? parsed.filter((news) => news && news.published !== false) : [];
    } catch {
      return [];
    }
  }

  async updateNews(user: AuthenticatedUser, content: string) {
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'STAFF') {
      throw new Error('Admin access required');
    }
    let parsed: unknown;
    try { parsed = JSON.parse(content); } catch { throw new Error('News content must be valid JSON'); }
    if (!Array.isArray(parsed)) throw new Error('News content must be a JSON array');
    for (const item of parsed) {
      if (!item || typeof item.title !== 'string' || typeof item.summary !== 'string') {
        throw new Error('Each news item must have a title and summary');
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
