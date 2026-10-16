import 'dotenv/config';
import { PrismaClient, CourseStatus } from '@prisma/client';

const prisma = new PrismaClient();

type AutumnCourse = {
  title: string;
  professor: string;
  level: 'MASTER' | 'DOCTORATE';
  category: string;
  startDate: string;
  classDays: string[];
  classStartTime: string;
  classEndTime: string;
  sessions: number;
  totalHours: number;
  price: number;
  schedule: string;
  description: string;
};

const courses: AutumnCourse[] = [
  { title: 'زبان عمومی و تخصصی', professor: 'دکتر محمد قاسمی', level: 'MASTER', category: 'عمومی', startDate: '۱۰ آبان ۱۴۰۵', classDays: ['SUNDAY'], classStartTime: '10:00', classEndTime: '14:00', sessions: 12, totalHours: 48, price: 6000000, schedule: 'یکشنبه، ساعت ۱۰ تا ۱۴؛ ۱۲ جلسه، مجموع ۴۸ ساعت', description: 'دوره آمادگی کنکور کارشناسی ارشد هنر؛ گروه دوم، ترم پاییز آنلاین ۱۴۰۵.' },
  { title: 'زبان عمومی و تخصصی', professor: 'دکتر محمد قاسمی', level: 'MASTER', category: 'عمومی', startDate: '۱۳ آبان ۱۴۰۵', classDays: ['WEDNESDAY'], classStartTime: '10:00', classEndTime: '14:00', sessions: 12, totalHours: 48, price: 6000000, schedule: 'چهارشنبه، ساعت ۱۰ تا ۱۴؛ ۱۲ جلسه، مجموع ۴۸ ساعت', description: 'دوره آمادگی کنکور کارشناسی ارشد هنر؛ گروه دوم، ترم پاییز آنلاین ۱۴۰۵.' },
  { title: 'نقد هنری و ادبی', professor: 'دکتر علی صابونچی', level: 'MASTER', category: 'عمومی', startDate: '۱۰ آبان ۱۴۰۵', classDays: ['SUNDAY'], classStartTime: '15:00', classEndTime: '19:00', sessions: 15, totalHours: 60, price: 7500000, schedule: 'یکشنبه، ساعت ۱۵ تا ۱۹؛ ۱۵ جلسه، مجموع ۶۰ ساعت', description: 'دوره آمادگی کنکور کارشناسی ارشد هنر؛ گروه دوم، ترم پاییز آنلاین ۱۴۰۵.' },
  { title: 'نقد هنری و ادبی', professor: 'دکتر مهدی انصاری', level: 'MASTER', category: 'عمومی', startDate: '۱۳ آبان ۱۴۰۵', classDays: ['WEDNESDAY'], classStartTime: '15:00', classEndTime: '19:00', sessions: 15, totalHours: 60, price: 7500000, schedule: 'چهارشنبه، ساعت ۱۵ تا ۱۹؛ ۱۵ جلسه، مجموع ۶۰ ساعت', description: 'دوره آمادگی کنکور کارشناسی ارشد هنر؛ گروه دوم، ترم پاییز آنلاین ۱۴۰۵.' },
  { title: 'اسطوره‌شناسی و تاریخ ادبیات ایران و جهان', professor: 'دکتر حمیدرضا قلیچ‌خانی و دکتر علی صابونچی', level: 'MASTER', category: 'عمومی', startDate: '۱۱ آبان ۱۴۰۵', classDays: ['MONDAY'], classStartTime: '10:00', classEndTime: '14:00', sessions: 10, totalHours: 40, price: 5000000, schedule: 'دوشنبه، ساعت ۱۰ تا ۱۴؛ ۱۰ جلسه، مجموع ۴۰ ساعت', description: 'دوره آمادگی کنکور کارشناسی ارشد هنر؛ گروه دوم، ترم پاییز آنلاین ۱۴۰۵.' },
  { title: 'اسطوره‌شناسی و تاریخ ادبیات ایران و جهان', professor: 'دکتر حمیدرضا قلیچ‌خانی و دکتر علی صابونچی', level: 'MASTER', category: 'عمومی', startDate: '۱۴ آبان ۱۴۰۵', classDays: ['THURSDAY'], classStartTime: '10:00', classEndTime: '14:00', sessions: 10, totalHours: 40, price: 5000000, schedule: 'پنجشنبه، ساعت ۱۰ تا ۱۴؛ ۱۰ جلسه، مجموع ۴۰ ساعت', description: 'دوره آمادگی کنکور کارشناسی ارشد هنر؛ گروه دوم، ترم پاییز آنلاین ۱۴۰۵.' },
  { title: 'تاریخ هنر ایران و جهان', professor: 'استاد احمد رستمعلی', level: 'MASTER', category: 'عمومی', startDate: '۱۱ آبان ۱۴۰۵', classDays: ['MONDAY'], classStartTime: '15:00', classEndTime: '19:30', sessions: 15, totalHours: 60, price: 7500000, schedule: 'دوشنبه، ساعت ۱۵ تا ۱۹:۳۰؛ ۱۵ جلسه، مجموع ۶۰ ساعت', description: 'طبق فایل مبنا، هر جلسه شامل ۳٫۵ ساعت آموزش و یک ساعت پرسش‌وپاسخ است. گروه دوم، ترم پاییز آنلاین ۱۴۰۵.' },
  { title: 'تاریخ هنر ایران و جهان', professor: 'استاد سیاوش میرزایی‌مهر', level: 'MASTER', category: 'عمومی', startDate: '۱۴ آبان ۱۴۰۵', classDays: ['THURSDAY'], classStartTime: '15:00', classEndTime: '19:00', sessions: 15, totalHours: 60, price: 7500000, schedule: 'پنجشنبه، ساعت ۱۵ تا ۱۹؛ ۱۵ جلسه، مجموع ۶۰ ساعت', description: 'دوره آمادگی کنکور کارشناسی ارشد هنر؛ گروه دوم، ترم پاییز آنلاین ۱۴۰۵.' },
  { title: 'فن‌شناسی عکاسی', professor: 'استاد مازیار باقرپور', level: 'MASTER', category: 'تخصصی', startDate: '۱۲ آبان ۱۴۰۵', classDays: ['TUESDAY'], classStartTime: '10:00', classEndTime: '14:00', sessions: 8, totalHours: 32, price: 5300000, schedule: 'سه‌شنبه، ساعت ۱۰ تا ۱۴؛ ۸ جلسه، مجموع ۳۲ ساعت', description: 'دوره تخصصی آمادگی کنکور کارشناسی ارشد؛ گروه دوم، ترم پاییز آنلاین ۱۴۰۵.' },
  { title: 'مبانی نظری عکاسی', professor: 'استاد مازیار باقرپور', level: 'MASTER', category: 'تخصصی', startDate: '۱۲ آبان ۱۴۰۵', classDays: ['TUESDAY'], classStartTime: '15:00', classEndTime: '19:00', sessions: 8, totalHours: 32, price: 5300000, schedule: 'سه‌شنبه، ساعت ۱۵ تا ۱۹؛ ۸ جلسه، مجموع ۳۲ ساعت', description: 'دوره تخصصی آمادگی کنکور کارشناسی ارشد؛ گروه دوم، ترم پاییز آنلاین ۱۴۰۵.' },
  { title: 'مبانی نظری سینما و بررسی و نقد آثار سینمایی', professor: 'دکتر امیررضا نوری‌پرتو', level: 'MASTER', category: 'تخصصی', startDate: '۱۲ آبان ۱۴۰۵', classDays: ['TUESDAY'], classStartTime: '16:00', classEndTime: '20:00', sessions: 15, totalHours: 60, price: 10000000, schedule: 'سه‌شنبه، ساعت ۱۶ تا ۲۰؛ ۱۵ جلسه، مجموع ۶۰ ساعت', description: 'دوره تخصصی آمادگی کنکور کارشناسی ارشد؛ گروه دوم، ترم پاییز آنلاین ۱۴۰۵.' },
  { title: 'دانستنی‌های تخصصی، تاریخی و بینشی در هنر نمایش / کارگردانی', professor: 'دکتر نریمان امینیان', level: 'MASTER', category: 'تخصصی', startDate: '۱۱ آبان ۱۴۰۵', classDays: ['MONDAY'], classStartTime: '15:00', classEndTime: '19:00', sessions: 10, totalHours: 40, price: 6500000, schedule: 'دوشنبه، ساعت ۱۵ تا ۱۹؛ ۱۰ جلسه، مجموع ۴۰ ساعت', description: 'دوره تخصصی آمادگی کنکور کارشناسی ارشد؛ گروه دوم، ترم پاییز آنلاین ۱۴۰۵.' },
  { title: 'فلسفه غرب', professor: 'دکتر میلاد نوری', level: 'MASTER', category: 'تخصصی', startDate: '۱۱ آبان ۱۴۰۵', classDays: ['MONDAY'], classStartTime: '17:00', classEndTime: '20:00', sessions: 12, totalHours: 36, price: 6000000, schedule: 'دوشنبه، ساعت ۱۷ تا ۲۰؛ ۱۲ جلسه، مجموع ۳۶ ساعت', description: 'دوره تخصصی آمادگی کنکور کارشناسی ارشد؛ گروه دوم، ترم پاییز آنلاین ۱۴۰۵.' },
  { title: 'منطق', professor: 'دکتر سعید سفیدگری', level: 'MASTER', category: 'تخصصی', startDate: '۱۳ آبان ۱۴۰۵', classDays: ['WEDNESDAY'], classStartTime: '11:00', classEndTime: '14:00', sessions: 12, totalHours: 36, price: 6000000, schedule: 'چهارشنبه، ساعت ۱۱ تا ۱۴؛ ۱۲ جلسه، مجموع ۳۶ ساعت', description: 'دوره تخصصی آمادگی کنکور کارشناسی ارشد؛ گروه دوم، ترم پاییز آنلاین ۱۴۰۵.' },
  { title: 'فلسفه اسلامی', professor: 'دکتر میلاد نوری', level: 'MASTER', category: 'تخصصی', startDate: '۱۴ آبان ۱۴۰۵', classDays: ['THURSDAY'], classStartTime: '17:00', classEndTime: '20:00', sessions: 12, totalHours: 36, price: 6000000, schedule: 'پنجشنبه، ساعت ۱۷ تا ۲۰؛ ۱۲ جلسه، مجموع ۳۶ ساعت', description: 'دوره تخصصی آمادگی کنکور کارشناسی ارشد؛ گروه دوم، ترم پاییز آنلاین ۱۴۰۵.' },
  { title: 'زبان عمومی', professor: 'دکتر محمد قاسمی', level: 'DOCTORATE', category: 'عمومی', startDate: '۲۲ مهر ۱۴۰۵', classDays: ['WEDNESDAY'], classStartTime: '15:00', classEndTime: '19:00', sessions: 10, totalHours: 40, price: 6000000, schedule: 'چهارشنبه، ساعت ۱۵ تا ۱۹؛ ۱۰ جلسه، مجموع ۴۰ ساعت', description: 'آمادگی کنکور دکتری تخصصی؛ گروه دوم، ترم پاییز آنلاین ۱۴۰۵.' },
  { title: 'تاریخ، فرهنگ و مکاتب هنری ایران و جهان؛ هنر و تمدن اسلامی', professor: 'دکتر علی‌اصغر میرزایی‌مهر و دکتر حمیدرضا قلیچ‌خانی', level: 'DOCTORATE', category: 'تخصصی', startDate: '۲۳ مهر ۱۴۰۵', classDays: ['THURSDAY'], classStartTime: '10:00', classEndTime: '14:00', sessions: 15, totalHours: 60, price: 9000000, schedule: 'پنجشنبه، ساعت ۱۰ تا ۱۴؛ ۱۵ جلسه، مجموع ۶۰ ساعت', description: 'آمادگی کنکور دکتری تخصصی؛ گروه دوم، ترم پاییز آنلاین ۱۴۰۵.' },
  { title: 'مبانی نظری (اسطوره‌شناسی، تاریخ ادبیات و حکمت هنر اسلامی)', professor: 'دکتر علی صابونچی', level: 'DOCTORATE', category: 'تخصصی', startDate: '۲۳ مهر ۱۴۰۵', classDays: ['THURSDAY'], classStartTime: '15:00', classEndTime: '19:00', sessions: 15, totalHours: 60, price: 9000000, schedule: 'پنجشنبه، ساعت ۱۵ تا ۱۹؛ ۱۵ جلسه، مجموع ۶۰ ساعت', description: 'آمادگی کنکور دکتری تخصصی؛ گروه دوم، ترم پاییز آنلاین ۱۴۰۵.' },
  { title: 'تئاتر', professor: 'دکتر سعید اسدی', level: 'DOCTORATE', category: 'تخصصی', startDate: '۲۸ مهر ۱۴۰۵', classDays: ['TUESDAY'], classStartTime: '15:00', classEndTime: '19:00', sessions: 10, totalHours: 40, price: 8000000, schedule: 'سه‌شنبه، ساعت ۱۵ تا ۱۹؛ ۱۰ جلسه، مجموع ۴۰ ساعت', description: 'آمادگی کنکور دکتری تخصصی؛ گروه دوم، ترم پاییز آنلاین ۱۴۰۵.' },
  { title: 'فلسفه غرب', professor: 'دکتر میلاد نوری', level: 'DOCTORATE', category: 'تخصصی', startDate: '۱۱ آبان ۱۴۰۵', classDays: ['MONDAY'], classStartTime: '17:00', classEndTime: '20:00', sessions: 12, totalHours: 36, price: 6000000, schedule: 'دوشنبه، ساعت ۱۷ تا ۲۰؛ ۱۲ جلسه، مجموع ۳۶ ساعت', description: 'آمادگی کنکور دکتری تخصصی؛ گروه دوم، ترم پاییز آنلاین ۱۴۰۵.' },
  { title: 'منطق', professor: 'دکتر سعید سفیدگری', level: 'DOCTORATE', category: 'تخصصی', startDate: '۱۳ آبان ۱۴۰۵', classDays: ['WEDNESDAY'], classStartTime: '11:00', classEndTime: '14:00', sessions: 12, totalHours: 36, price: 6000000, schedule: 'چهارشنبه، ساعت ۱۱ تا ۱۴؛ ۱۲ جلسه، مجموع ۳۶ ساعت', description: 'آمادگی کنکور دکتری تخصصی؛ گروه دوم، ترم پاییز آنلاین ۱۴۰۵.' },
  { title: 'فلسفه اسلامی', professor: 'دکتر میلاد نوری', level: 'DOCTORATE', category: 'تخصصی', startDate: '۱۴ آبان ۱۴۰۵', classDays: ['THURSDAY'], classStartTime: '17:00', classEndTime: '20:00', sessions: 12, totalHours: 36, price: 6000000, schedule: 'پنجشنبه، ساعت ۱۷ تا ۲۰؛ ۱۲ جلسه، مجموع ۳۶ ساعت', description: 'آمادگی کنکور دکتری تخصصی؛ گروه دوم، ترم پاییز آنلاین ۱۴۰۵.' },
];

async function main() {
  let created = 0;
  let updated = 0;
  for (const course of courses) {
    const term = 'پاییز ۱۴۰۵';
    const existing = await prisma.course.findFirst({
      where: {
        title: course.title,
        professor: course.professor,
        level: course.level,
        term,
        startDate: course.startDate,
        schedule: course.schedule,
        classDays: { equals: course.classDays },
        classStartTime: course.classStartTime,
        classEndTime: course.classEndTime,
      },
      select: { id: true },
    });
    const data = {
      title: course.title,
      professor: course.professor,
      level: course.level,
      category: course.category,
      term,
      startDate: course.startDate,
      schedule: course.schedule,
      price: course.price,
      description: course.description,
      academicYear: 1405,
      classDays: course.classDays,
      classStartTime: course.classStartTime,
      classEndTime: course.classEndTime,
    };
    if (existing) {
      // Preserve the status of an existing course; only new records start as DRAFT.
      await prisma.course.update({ where: { id: existing.id }, data });
      updated += 1;
    } else {
      await prisma.course.create({ data: { ...data, status: CourseStatus.DRAFT } });
      created += 1;
    }
  }
  console.log(JSON.stringify({ total: courses.length, created, updated, status: 'DRAFT', note: 'Review all records in admin before publishing.' }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
