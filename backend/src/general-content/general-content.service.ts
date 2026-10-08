import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';

const RULES_KEY = 'rules';

const DEFAULT_RULES = '۱. حضور به موقع در کلاس‌های آنلاین الزامی است.\n۲. انتشار محتوای دوره‌ها پیگرد قانونی دارد.';

@Injectable()
export class GeneralContentService {
  constructor(private readonly prisma: PrismaService) {}

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
