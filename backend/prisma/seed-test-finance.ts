import 'dotenv/config';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const FIXTURE_ACTION = 'FINANCE_FIXTURE_V1';
const RECEIPT_KEY = 'finance-fixture-v1.png';
const RECEIPT_DIR = process.env.REGISTRATION_RECEIPT_STORAGE_PATH
  || join(process.env.FILE_STORAGE_PATH || '/opt/shamseh-app/storage/files', 'registration-receipts');
const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=',
  'base64',
);

const nationalIds = [...new Set((process.env.TEST_FINANCE_NATIONAL_IDS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean))];
const courseId = process.env.TEST_FINANCE_COURSE_ID;

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

function assertConfiguration() {
  if (process.env.CONFIRM_FINANCE_FIXTURES !== 'YES') {
    throw new Error('برای اجرای کنترل‌شده، CONFIRM_FINANCE_FIXTURES=YES را صریحاً تنظیم کنید.');
  }
  if (nationalIds.length !== 9 || nationalIds.some((id) => !/^TEST\d{3,}$/.test(id))) {
    throw new Error('TEST_FINANCE_NATIONAL_IDS باید دقیقاً شامل ۹ کد ملی آزمایشی موجود با قالب TEST001 باشد.');
  }
  if (!courseId) throw new Error('TEST_FINANCE_COURSE_ID باید شناسه یک دوره فعال موجود باشد.');
}

async function ensureReceiptFile() {
  await mkdir(RECEIPT_DIR, { recursive: true });
  const path = join(RECEIPT_DIR, RECEIPT_KEY);
  try {
    const existing = await readFile(path);
    if (!existing.equals(PNG_BYTES)) {
      throw new Error('فایل رسید آزمایشی با همین نام وجود دارد اما محتوای آن متعلق به این Fixture نیست؛ فایل موجود تغییر داده نشد.');
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    await writeFile(path, PNG_BYTES, { flag: 'wx', mode: 0o640 });
  }
}

async function hasFixture(studentId: string, scenario: string) {
  return Boolean(await prisma.registration.findFirst({
    where: {
      studentId,
      reviewHistory: { some: { action: FIXTURE_ACTION, note: scenario } },
    },
    select: { id: true },
  }));
}

async function createFixture(input: {
  student: {
    id: string; nationalId: string; fullName: string; phone: string;
    academicLevel: 'MASTER' | 'DOCTORATE' | null; fieldCode: string | null;
  };
  course: { id: string; title: string; price: number };
  scenario: string;
  status: 'APPROVED' | 'PENDING_REVIEW' | 'NEEDS_CORRECTION' | 'REJECTED';
  mode?: 'NORMAL' | 'PAYMENT_EXCEPTION';
  initialRatio: number;
  installmentRatios?: readonly number[];
  dueOffsetsDays?: readonly number[];
  paymentStatus: 'APPROVED' | 'PENDING' | 'REJECTED';
  rejectionReason?: string;
  exceptionReason?: string;
}) {
  const {
    student, course, scenario, status, mode = 'NORMAL', initialRatio,
    installmentRatios = [], dueOffsetsDays = [], paymentStatus, rejectionReason, exceptionReason,
  } = input;
  if (await hasFixture(student.id, scenario)) {
    return { scenario, result: 'already exists' };
  }

  const openRegistration = await prisma.registration.findFirst({
    where: {
      nationalId: student.nationalId,
      status: { in: ['PENDING_REVIEW', 'NEEDS_CORRECTION'] },
    },
    select: { id: true },
  });
  if (status !== 'APPROVED' && openRegistration) {
    throw new Error(`برای ${student.nationalId} یک ثبت‌نام باز موجود است؛ این سناریو ساخته نشد و داده قبلی تغییر نکرد.`);
  }

  const tuition = course.price;
  const initialAmount = money(tuition * initialRatio);
  const installmentAmounts = installmentRatios.map((ratio) => money(tuition * ratio));
  const totalPlanned = money(initialAmount + installmentAmounts.reduce((total, value) => total + value, 0));
  if (totalPlanned > tuition + 0.01) throw new Error(`مجموع مبالغ سناریوی ${scenario} از شهریه بیشتر است.`);

  return prisma.$transaction(async (tx) => {
    const existingEnrollment = await tx.enrollment.findUnique({
      where: { studentId_courseId: { studentId: student.id, courseId: course.id } },
      select: { id: true, status: true },
    });
    if (status === 'APPROVED' && existingEnrollment && existingEnrollment.status !== 'ACTIVE') {
      throw new Error(`وضعیت ثبت‌نام دوره برای ${student.nationalId} فعال نیست؛ رکورد موجود تغییر داده نشد.`);
    }
    if (status === 'APPROVED' && !existingEnrollment) {
      await tx.enrollment.create({
        data: {
          studentId: student.id,
          courseId: course.id,
          status: 'ACTIVE',
          tuitionAmount: course.price,
        },
      });
    }

    const now = new Date();
    const registration = await tx.registration.create({
      data: {
        applicantFullName: student.fullName,
        nationalId: student.nationalId,
        phone: student.phone,
        academicLevel: student.academicLevel || 'MASTER',
        fieldCode: student.fieldCode || 'TEST',
        studentId: student.id,
        status,
        approvalMode: status === 'APPROVED' ? mode : null,
        originalTuition: tuition,
        discountAmount: 0,
        finalTuition: tuition,
        exceptionReason: mode === 'PAYMENT_EXCEPTION' ? exceptionReason : null,
        reviewNote: status === 'NEEDS_CORRECTION' ? 'رسید آزمایشی نیازمند اصلاح است.' : null,
        reviewedAt: status === 'PENDING_REVIEW' ? null : now,
        approvedAt: status === 'APPROVED' ? now : null,
        courses: {
          create: {
            courseId: course.id,
            courseTitleSnapshot: course.title,
            coursePriceSnapshot: tuition,
          },
        },
      },
      select: { id: true },
    });

    const payment = await tx.registrationPayment.create({
      data: {
        registrationId: registration.id,
        purpose: 'INITIAL',
        status: paymentStatus,
        claimedAmount: initialAmount,
        approvedAmount: paymentStatus === 'APPROVED' ? initialAmount : null,
        paymentDate: now,
        trackingCode: `FINANCE-FIXTURE-${scenario}-INITIAL`,
        rejectionReason: paymentStatus === 'REJECTED' ? (rejectionReason || 'رسید آزمایشی نامعتبر است.') : null,
        reviewedAt: paymentStatus === 'PENDING' ? null : now,
        receipts: {
          create: {
            storageKey: RECEIPT_KEY,
            mimeType: 'image/png',
            fileSize: BigInt(PNG_BYTES.length),
          },
        },
      },
      select: { id: true },
    });

    const installments = [];
    for (let index = 0; index < installmentAmounts.length; index += 1) {
      const offset = dueOffsetsDays[index] ?? 30 * (index + 1);
      const dueDate = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
      const installment = await tx.installment.create({
        data: {
          registrationId: registration.id,
          sequence: index + 1,
          amount: installmentAmounts[index],
          dueDate,
          status: offset < 0 ? 'OVERDUE' : 'PENDING',
        },
        select: { id: true, amount: true, sequence: true, dueDate: true },
      });
      installments.push(installment);
    }

    await tx.registrationReviewHistory.create({
      data: {
        registrationId: registration.id,
        action: FIXTURE_ACTION,
        note: scenario,
        metadata: { fixtureVersion: 1, scenario, testOnly: true },
      },
    });
    await tx.registrationReviewHistory.create({
      data: {
        registrationId: registration.id,
        action: status === 'APPROVED' ? 'APPROVED' : status,
        fromStatus: status === 'APPROVED' ? 'PENDING_REVIEW' : null,
        toStatus: status,
        note: 'داده آزمایشی کنترل‌شده؛ اطلاعات حساب هنرجو تغییر نکرده است.',
      },
    });

    return { scenario, registrationId: registration.id, initialPaymentId: payment.id, installments };
  });
}

async function addOldestDebtAllocation(studentId: string, registrationId: string, tuition: number) {
  const trackingCode = 'FINANCE-FIXTURE-OLDEST-FIRST';
  const existing = await prisma.registrationPayment.findFirst({
    where: { registrationId, trackingCode },
    select: { id: true },
  });
  if (existing) return { result: 'already exists', paymentId: existing.id };

  return prisma.$transaction(async (tx) => {
    const installments = await tx.installment.findMany({
      where: { registrationId, registration: { studentId, status: 'APPROVED' } },
      include: { allocations: { select: { amount: true } } },
      orderBy: [{ dueDate: 'asc' }, { sequence: 'asc' }],
    });
    const debt = installments.map((item) => ({
      id: item.id,
      balance: money(Number(item.amount) - item.allocations.reduce((sum, allocation) => sum + Number(allocation.amount), 0)),
    })).filter((item) => item.balance > 0.01);
    if (debt.length < 2) throw new Error('برای سناریوی تخصیص قدیمی‌ترین بدهی، حداقل دو قسط باز لازم است.');

    const paymentAmount = money(tuition * 0.25);
    const payment = await tx.registrationPayment.create({
      data: {
        registrationId,
        purpose: 'INSTALLMENT',
        status: 'APPROVED',
        claimedAmount: paymentAmount,
        approvedAmount: paymentAmount,
        paymentDate: new Date(),
        trackingCode,
        reviewedAt: new Date(),
        receipts: {
          create: {
            storageKey: RECEIPT_KEY,
            mimeType: 'image/png',
            fileSize: BigInt(PNG_BYTES.length),
          },
        },
      },
      select: { id: true },
    });

    let remaining = paymentAmount;
    const allocations = [];
    for (const item of debt) {
      if (remaining <= 0.01) break;
      const amount = money(Math.min(item.balance, remaining));
      if (amount <= 0) continue;
      await tx.paymentAllocation.create({
        data: { paymentId: payment.id, installmentId: item.id, amount },
      });
      allocations.push({ installmentId: item.id, amount });
      remaining = money(remaining - amount);
      const source = installments.find((candidate) => candidate.id === item.id)!;
      const paidBefore = money(Number(source.amount) - item.balance);
      const paidAfter = money(paidBefore + amount);
      await tx.installment.update({
        where: { id: item.id },
        data: { status: paidAfter + 0.01 >= Number(source.amount) ? 'PAID' : 'PARTIALLY_PAID' },
      });
    }
    if (remaining > 0.01) throw new Error('مبلغ پرداخت آزمایشی از مجموع بدهی‌های قابل تخصیص بیشتر است.');
    await tx.registrationReviewHistory.create({
      data: {
        registrationId,
        action: 'INSTALLMENT_PAYMENT_APPROVED',
        note: 'داده آزمایشی: تخصیص پرداخت به قدیمی‌ترین اقساط باز',
        metadata: { paymentId: payment.id, allocations, testOnly: true },
      },
    });
    return { paymentId: payment.id, allocations };
  });
}

async function main() {
  if (process.argv.includes('--list')) {
    const [students, courses] = await Promise.all([
      prisma.student.findMany({
        where: { nationalId: { startsWith: 'TEST' }, user: { role: 'STUDENT' } },
        select: { id: true, nationalId: true, fullName: true, phone: true, academicLevel: true },
        orderBy: { nationalId: 'asc' },
        take: 50,
      }),
      prisma.course.findMany({
        where: { status: 'ACTIVE', price: { not: null } },
        select: { id: true, title: true, price: true },
        orderBy: { title: 'asc' },
        take: 50,
      }),
    ]);
    const openRegistrations = students.length ? await prisma.registration.findMany({
      where: {
        nationalId: { in: students.map((student) => student.nationalId) },
        status: { in: ['PENDING_REVIEW', 'NEEDS_CORRECTION'] },
      },
      select: { nationalId: true },
    }) : [];
    const openNationalIds = new Set(openRegistrations.map((item) => item.nationalId));
    process.stdout.write(JSON.stringify({
      mode: 'READ_ONLY_CANDIDATE_LIST',
      students: students.map((student) => ({
        ...student,
        hasOpenRegistration: openNationalIds.has(student.nationalId),
      })),
      courses: courses.map((course) => ({ ...course, price: Number(course.price) })),
    }, null, 2) + '\\n');
    return;
  }

  assertConfiguration();

  const courseRow = await prisma.course.findFirst({
    where: { id: courseId, status: 'ACTIVE', price: { not: null } },
    select: { id: true, title: true, price: true },
  });
  if (!courseRow?.price || Number(courseRow.price) <= 0) {
    throw new Error('دوره فعال با قیمت معتبر و شناسه TEST_FINANCE_COURSE_ID پیدا نشد.');
  }
  const course = { ...courseRow, price: Number(courseRow.price) };

  const studentRows = await prisma.student.findMany({
    where: { nationalId: { in: nationalIds }, user: { role: 'STUDENT' } },
    select: { id: true, nationalId: true, fullName: true, phone: true, academicLevel: true, fieldCode: true },
  });
  if (studentRows.length !== nationalIds.length) {
    throw new Error('همه ۹ هنرجوی آزمایشی موجود پیدا نشدند؛ هیچ هنرجویی ساخته یا اصلاح نمی‌شود.');
  }
  const studentsByNationalId = new Map(studentRows.map((student) => [student.nationalId, student]));
  const students = nationalIds.map((nationalId) => studentsByNationalId.get(nationalId)!);

  const scenarios = [
    { scenario: 'FULLY_PAID', status: 'APPROVED', initialRatio: 1, paymentStatus: 'APPROVED' },
    { scenario: 'SIXTY_PERCENT_TWO_INSTALLMENTS', status: 'APPROVED', initialRatio: 0.6, installmentRatios: [0.2, 0.2], paymentStatus: 'APPROVED' },
    { scenario: 'EIGHTY_PERCENT_ONE_INSTALLMENT', status: 'APPROVED', initialRatio: 0.8, installmentRatios: [0.2], paymentStatus: 'APPROVED' },
    { scenario: 'PAYMENT_EXCEPTION_OPEN_DEBT', status: 'APPROVED', mode: 'PAYMENT_EXCEPTION', initialRatio: 0.5, installmentRatios: [0.25, 0.25], paymentStatus: 'APPROVED', exceptionReason: 'سناریوی آزمایشی استثنای پرداخت زیر ۶۰٪' },
    { scenario: 'OVERDUE_UNPAID_INSTALLMENTS', status: 'APPROVED', initialRatio: 0.6, installmentRatios: [0.2, 0.2], dueOffsetsDays: [-60, -30], paymentStatus: 'APPROVED' },
    { scenario: 'PENDING_RECEIPT', status: 'PENDING_REVIEW', initialRatio: 0.6, paymentStatus: 'PENDING' },
    { scenario: 'NEEDS_CORRECTION_REJECTED_RECEIPT', status: 'NEEDS_CORRECTION', initialRatio: 0.6, paymentStatus: 'REJECTED', rejectionReason: 'رسید آزمایشی نیازمند ارسال مجدد است.' },
    { scenario: 'REJECTED_REGISTRATION', status: 'REJECTED', initialRatio: 0.6, paymentStatus: 'REJECTED', rejectionReason: 'رد آزمایشی ثبت‌نام.' },
    { scenario: 'OLDEST_DEBT_OVERPAYMENT', status: 'APPROVED', initialRatio: 0.6, installmentRatios: [0.2, 0.2], paymentStatus: 'APPROVED' },
  ] as const;

  // Complete read-only preflight before creating the receipt file or any database rows.
  for (let index = 0; index < scenarios.length; index += 1) {
    const scenario = scenarios[index];
    const student = students[index];
    if (await hasFixture(student.id, scenario.scenario)) continue;

    if (scenario.status === 'APPROVED') {
      const enrollment = await prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: student.id, courseId: course.id } },
        select: { status: true },
      });
      if (enrollment && enrollment.status !== 'ACTIVE') {
        throw new Error(`وضعیت ثبت‌نام دوره برای ${student.nationalId} فعال نیست؛ هیچ داده‌ای تغییر نکرد.`);
      }
    } else if (scenario.status === 'PENDING_REVIEW' || scenario.status === 'NEEDS_CORRECTION') {
      const openRegistration = await prisma.registration.findFirst({
        where: { nationalId: student.nationalId, status: { in: ['PENDING_REVIEW', 'NEEDS_CORRECTION'] } },
        select: { id: true },
      });
      if (openRegistration) {
        throw new Error(`برای ${student.nationalId} یک ثبت‌نام باز موجود است؛ هیچ داده‌ای ساخته نشد.`);
      }
    }
  }

  await ensureReceiptFile();

  const results = [];
  for (let index = 0; index < scenarios.length; index += 1) {
    results.push(await createFixture({
      student: students[index],
      course,
      ...scenarios[index],
    }));
  }

  const overpaymentRegistration = await prisma.registration.findFirstOrThrow({
    where: {
      studentId: students[8].id,
      reviewHistory: { some: { action: FIXTURE_ACTION, note: 'OLDEST_DEBT_OVERPAYMENT' } },
    },
    select: { id: true },
  });
  const allocation = await addOldestDebtAllocation(students[8].id, overpaymentRegistration.id, course.price);

  process.stdout.write(JSON.stringify(results, null, 2) + '\n');
  process.stdout.write(JSON.stringify({ scenario: 'OLDEST_DEBT_FIRST_ALLOCATION', ...allocation }, null, 2) + '\n');
}

main()
  .catch((error) => {
    process.stderr.write(String(error instanceof Error ? error.message : error) + '\n');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
