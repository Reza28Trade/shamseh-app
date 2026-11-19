import 'dotenv/config';
import * as argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const FIXTURE_ACTION = 'FINANCE_LOAD_FIXTURE_V2';
const RECEIPT_KEY = 'finance-load-fixture-v2.png';
const RECEIPT_DIR = process.env.REGISTRATION_RECEIPT_STORAGE_PATH
  || join(process.env.FILE_STORAGE_PATH || '/opt/shamseh-app/storage/files', 'registration-receipts');
const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1sAAAAASUVORK5CYII=',
  'base64',
);
const batch = (process.env.TEST_FINANCE_BATCH || 'FINANCE-QA-20261119').trim();
const studentCount = Number(process.env.TEST_FINANCE_STUDENT_COUNT || 100);
const courseId = process.env.TEST_FINANCE_COURSE_ID;

type TestStudent = {
  id: string;
  nationalId: string;
  fullName: string;
  phone: string;
  academicLevel: 'MASTER' | 'DOCTORATE';
  fieldCode: string;
};

type Scenario = {
  key: string;
  status: 'APPROVED' | 'PENDING_REVIEW' | 'NEEDS_CORRECTION' | 'REJECTED';
  approvalMode?: 'NORMAL' | 'PAYMENT_EXCEPTION';
  initialRatio: number;
  installmentRatios?: number[];
  dueOffsetsDays?: number[];
  paymentStatus: 'APPROVED' | 'PENDING' | 'REJECTED';
  installmentPayment?: 'APPROVED_PARTIAL' | 'PENDING_PARTIAL';
  receiptCount?: number;
  rejectionReason?: string;
  exceptionReason?: string;
};

const scenarios: Scenario[] = [
  { key: 'FULLY_PAID', status: 'APPROVED', initialRatio: 1, paymentStatus: 'APPROVED', receiptCount: 2 },
  { key: 'SIXTY_PERCENT_TWO_INSTALLMENTS', status: 'APPROVED', initialRatio: 0.6, installmentRatios: [0.2, 0.2], paymentStatus: 'APPROVED' },
  { key: 'EIGHTY_PERCENT_ONE_INSTALLMENT', status: 'APPROVED', initialRatio: 0.8, installmentRatios: [0.2], paymentStatus: 'APPROVED' },
  {
    key: 'PAYMENT_EXCEPTION_OPEN_DEBT',
    status: 'APPROVED',
    approvalMode: 'PAYMENT_EXCEPTION',
    initialRatio: 0.5,
    installmentRatios: [0.25, 0.25],
    paymentStatus: 'APPROVED',
    exceptionReason: 'سناریوی آزمایشی استثنای پرداخت زیر ۶۰ درصد',
  },
  {
    key: 'OVERDUE_UNPAID_INSTALLMENTS',
    status: 'APPROVED',
    initialRatio: 0.6,
    installmentRatios: [0.2, 0.2],
    dueOffsetsDays: [-60, -30],
    paymentStatus: 'APPROVED',
  },
  { key: 'PENDING_INITIAL_RECEIPT', status: 'PENDING_REVIEW', initialRatio: 0.6, paymentStatus: 'PENDING' },
  {
    key: 'NEEDS_CORRECTION_REJECTED_RECEIPT',
    status: 'NEEDS_CORRECTION',
    initialRatio: 0.6,
    paymentStatus: 'REJECTED',
    rejectionReason: 'رسید آزمایشی نیازمند ارسال مجدد است.',
  },
  {
    key: 'REJECTED_REGISTRATION',
    status: 'REJECTED',
    initialRatio: 0.6,
    paymentStatus: 'REJECTED',
    rejectionReason: 'رد آزمایشی ثبت‌نام.',
  },
  {
    key: 'PARTIALLY_PAID_INSTALLMENT',
    status: 'APPROVED',
    initialRatio: 0.6,
    installmentRatios: [0.2, 0.2],
    paymentStatus: 'APPROVED',
    installmentPayment: 'APPROVED_PARTIAL',
  },
  {
    key: 'PENDING_INSTALLMENT_PAYMENT',
    status: 'APPROVED',
    initialRatio: 0.6,
    installmentRatios: [0.2, 0.2],
    paymentStatus: 'APPROVED',
    installmentPayment: 'PENDING_PARTIAL',
  },
];

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

function assertConfiguration() {
  if (process.env.CONFIRM_FINANCE_FIXTURES !== 'YES') {
    throw new Error('برای ایجاد داده، CONFIRM_FINANCE_FIXTURES=YES را صریحاً تنظیم کنید.');
  }
  if (!/^[A-Z0-9-]{6,48}$/.test(batch)) {
    throw new Error('TEST_FINANCE_BATCH باید فقط شامل حروف بزرگ انگلیسی، عدد و خط تیره باشد.');
  }
  if (!Number.isInteger(studentCount) || studentCount < 10 || studentCount > 500) {
    throw new Error('TEST_FINANCE_STUDENT_COUNT باید عددی بین ۱۰ تا ۵۰۰ باشد.');
  }
  if (!courseId) {
    throw new Error('TEST_FINANCE_COURSE_ID باید شناسه یک دوره فعال با شهریه معتبر باشد.');
  }
}

function nationalIdFor(index: number) {
  return batch + '-' + String(index).padStart(3, '0');
}

async function ensureTestStudent(index: number): Promise<TestStudent> {
  const suffix = String(index).padStart(3, '0');
  const nationalId = nationalIdFor(index);
  const username = nationalId;
  const fullName = 'هنرجوی آزمایشی مالی ' + suffix + ' (' + batch + ')';
  const phone = '0900000' + suffix.padStart(4, '0');
  const academicLevel = index % 2 === 0 ? 'DOCTORATE' : 'MASTER';
  const fieldCode = 'FINQA-' + String(((index - 1) % 5) + 1).padStart(2, '0');

  const existing = await prisma.student.findUnique({
    where: { nationalId },
    include: { user: { select: { username: true, role: true, status: true } } },
  });

  if (existing) {
    if (
      existing.user.username !== username
      || existing.user.role !== 'STUDENT'
      || existing.user.status !== 'INACTIVE'
      || existing.fullName !== fullName
      || existing.phone !== phone
      || existing.academicLevel !== academicLevel
      || existing.fieldCode !== fieldCode
    ) {
      throw new Error('رکوردی با شناسه ' + nationalId + ' وجود دارد اما متعلق به این مجموعه آزمایشی نیست؛ هیچ اطلاعاتی تغییر نکرد.');
    }
    return {
      id: existing.id,
      nationalId: existing.nationalId,
      fullName: existing.fullName,
      phone: existing.phone || phone,
      academicLevel,
      fieldCode,
    };
  }

  const usernameCollision = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (usernameCollision) {
    throw new Error('نام کاربری ' + username + ' قبلاً استفاده شده اما هنرجوی متناظر پیدا نشد؛ هیچ رکوردی تغییر نکرد.');
  }

  const passwordHash = await argon2.hash(randomBytes(32));
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        username,
        passwordHash,
        role: 'STUDENT',
        status: 'INACTIVE',
      },
      select: { id: true },
    });
    const student = await tx.student.create({
      data: {
        userId: user.id,
        fullName,
        nationalId,
        phone,
        academicLevel,
        fieldCode,
      },
      select: { id: true, nationalId: true, fullName: true, phone: true },
    });
    return {
      id: student.id,
      nationalId: student.nationalId,
      fullName: student.fullName,
      phone: student.phone || phone,
      academicLevel,
      fieldCode,
    };
  });
}

async function hasFixture(studentId: string, scenarioKey: string) {
  return Boolean(await prisma.registration.findFirst({
    where: {
      studentId,
      reviewHistory: { some: { action: FIXTURE_ACTION, note: scenarioKey } },
    },
    select: { id: true },
  }));
}

async function ensureReceiptFile() {
  await mkdir(RECEIPT_DIR, { recursive: true });
  const path = join(RECEIPT_DIR, RECEIPT_KEY);
  try {
    const existing = await readFile(path);
    if (!existing.equals(PNG_BYTES)) {
      throw new Error('فایل رسید آزمایشی هم‌نام وجود دارد اما متعلق به این مجموعه نیست؛ فایل موجود تغییر داده نشد.');
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    await writeFile(path, PNG_BYTES, { flag: 'wx', mode: 0o640 });
  }
}

async function createFixture(
  student: TestStudent,
  course: { id: string; title: string; price: number },
  scenario: Scenario,
  index: number,
) {
  const scenarioKey = scenario.key + '-' + String(index).padStart(3, '0');
  if (await hasFixture(student.id, scenarioKey)) {
    return { scenario: scenarioKey, result: 'already exists' };
  }

  const openRegistration = await prisma.registration.findFirst({
    where: {
      nationalId: student.nationalId,
      status: { in: ['PENDING_REVIEW', 'NEEDS_CORRECTION'] },
    },
    select: { id: true },
  });
  if (openRegistration) {
    throw new Error('برای هنرجوی آزمایشی ' + student.nationalId + ' یک ثبت‌نام باز خارج از این Fixture وجود دارد؛ داده قبلی تغییر نکرد.');
  }

  const tuition = course.price;
  const initialAmount = money(tuition * scenario.initialRatio);
  const installmentAmounts = (scenario.installmentRatios || []).map((ratio) => money(tuition * ratio));
  const totalPlanned = money(initialAmount + installmentAmounts.reduce((sum, value) => sum + value, 0));
  if (totalPlanned > tuition + 0.01) {
    throw new Error('مجموع مبالغ سناریوی ' + scenarioKey + ' از شهریه بیشتر است.');
  }

  return prisma.$transaction(async (tx) => {
    const existingEnrollment = await tx.enrollment.findUnique({
      where: { studentId_courseId: { studentId: student.id, courseId: course.id } },
      select: { id: true },
    });
    if (scenario.status === 'APPROVED' && existingEnrollment) {
      throw new Error('برای هنرجوی آزمایشی ' + student.nationalId + ' ثبت‌نام دوره‌ای از قبل وجود دارد؛ هیچ رکوردی تغییر نکرد.');
    }

    const now = new Date();
    const registration = await tx.registration.create({
      data: {
        applicantFullName: student.fullName,
        nationalId: student.nationalId,
        phone: student.phone,
        academicLevel: student.academicLevel,
        fieldCode: student.fieldCode,
        studentId: student.id,
        status: scenario.status,
        approvalMode: scenario.status === 'APPROVED' ? (scenario.approvalMode || 'NORMAL') : null,
        originalTuition: tuition,
        discountAmount: 0,
        finalTuition: tuition,
        exceptionReason: scenario.exceptionReason || null,
        reviewNote: scenario.status === 'NEEDS_CORRECTION' ? 'رسید آزمایشی نیازمند اصلاح است.' : null,
        reviewedAt: scenario.status === 'PENDING_REVIEW' ? null : now,
        approvedAt: scenario.status === 'APPROVED' ? now : null,
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

    if (scenario.status === 'APPROVED') {
      await tx.enrollment.create({
        data: {
          studentId: student.id,
          courseId: course.id,
          status: 'ACTIVE',
          tuitionAmount: tuition,
        },
      });
    }

    const initialPayment = await tx.registrationPayment.create({
      data: {
        registrationId: registration.id,
        purpose: 'INITIAL',
        status: scenario.paymentStatus,
        claimedAmount: initialAmount,
        approvedAmount: scenario.paymentStatus === 'APPROVED' ? initialAmount : null,
        paymentDate: now,
        trackingCode: 'FINANCE-QA-' + scenarioKey + '-INITIAL',
        rejectionReason: scenario.paymentStatus === 'REJECTED'
          ? (scenario.rejectionReason || 'رسید آزمایشی نامعتبر است.')
          : null,
        reviewedAt: scenario.paymentStatus === 'PENDING' ? null : now,
        receipts: {
          create: Array.from({ length: scenario.receiptCount || 1 }, () => ({
            storageKey: RECEIPT_KEY,
            mimeType: 'image/png',
            fileSize: BigInt(PNG_BYTES.length),
          })),
        },
      },
      select: { id: true },
    });

    const installments: Array<{ id: string; amount: number; sequence: number; dueDate: Date }> = [];
    for (let installmentIndex = 0; installmentIndex < installmentAmounts.length; installmentIndex += 1) {
      const offset = scenario.dueOffsetsDays?.[installmentIndex] ?? 30 * (installmentIndex + 1);
      const dueDate = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
      const installment = await tx.installment.create({
        data: {
          registrationId: registration.id,
          sequence: installmentIndex + 1,
          amount: installmentAmounts[installmentIndex],
          dueDate,
          status: offset < 0 ? 'OVERDUE' : 'PENDING',
        },
        select: { id: true, amount: true, sequence: true, dueDate: true },
      });
      installments.push({
        id: installment.id,
        amount: Number(installment.amount),
        sequence: installment.sequence,
        dueDate: installment.dueDate,
      });
    }

    await tx.registrationReviewHistory.create({
      data: {
        registrationId: registration.id,
        action: FIXTURE_ACTION,
        note: scenarioKey,
        metadata: { fixtureVersion: 2, batch, scenario: scenario.key, index, testOnly: true },
      },
    });
    await tx.registrationReviewHistory.create({
      data: {
        registrationId: registration.id,
        action: scenario.status,
        fromStatus: scenario.status === 'PENDING_REVIEW' ? null : 'PENDING_REVIEW',
        toStatus: scenario.status,
        note: 'داده آزمایشی کنترل‌شده؛ حساب و اطلاعات هنرجویان واقعی تغییر نکرده است.',
      },
    });

    if (scenario.installmentPayment && installments.length) {
      const firstInstallment = installments[0];
      const claimedAmount = money(firstInstallment.amount * 0.5);
      const isApproved = scenario.installmentPayment === 'APPROVED_PARTIAL';
      const installmentPayment = await tx.registrationPayment.create({
        data: {
          registrationId: registration.id,
          purpose: 'INSTALLMENT',
          status: isApproved ? 'APPROVED' : 'PENDING',
          claimedAmount,
          approvedAmount: isApproved ? claimedAmount : null,
          paymentDate: now,
          trackingCode: 'FINANCE-QA-' + scenarioKey + '-INSTALLMENT',
          reviewedAt: isApproved ? now : null,
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

      if (isApproved) {
        await tx.paymentAllocation.create({
          data: {
            paymentId: installmentPayment.id,
            installmentId: firstInstallment.id,
            amount: claimedAmount,
          },
        });
        await tx.installment.update({
          where: { id: firstInstallment.id },
          data: { status: 'PARTIALLY_PAID' },
        });
      }

      await tx.registrationReviewHistory.create({
        data: {
          registrationId: registration.id,
          action: isApproved ? 'INSTALLMENT_PAYMENT_APPROVED' : 'INSTALLMENT_PAYMENT_SUBMITTED',
          note: 'پرداخت آزمایشی پنجاه درصد از قسط اول',
          metadata: { paymentId: installmentPayment.id, claimedAmount, testOnly: true },
        },
      });
    }

    return {
      scenario: scenarioKey,
      registrationId: registration.id,
      initialPaymentId: initialPayment.id,
      installmentCount: installments.length,
    };
  });
}

async function listCandidates() {
  const [students, courses] = await Promise.all([
    prisma.student.findMany({
      where: { nationalId: { startsWith: batch + '-' } },
      select: {
        id: true,
        nationalId: true,
        fullName: true,
        phone: true,
        academicLevel: true,
        user: { select: { status: true } },
      },
      orderBy: { nationalId: 'asc' },
      take: 500,
    }),
    prisma.course.findMany({
      where: { status: 'ACTIVE', price: { not: null } },
      select: { id: true, title: true, price: true },
      orderBy: { title: 'asc' },
      take: 50,
    }),
  ]);
  process.stdout.write(JSON.stringify({
    mode: 'READ_ONLY_FINANCE_LOAD_CANDIDATE_LIST',
    batch,
    expectedStudentCount: studentCount,
    students: students.map((student) => ({
      ...student,
      accountStatus: student.user.status,
    })),
    courses: courses.map((course) => ({ ...course, price: Number(course.price) })),
  }, null, 2) + '\n');
}

async function main() {
  if (process.argv.includes('--list')) {
    await listCandidates();
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
  const course = { id: courseRow.id, title: courseRow.title, price: Number(courseRow.price) };

  const students: TestStudent[] = [];
  for (let index = 1; index <= studentCount; index += 1) {
    students.push(await ensureTestStudent(index));
  }

  // Read-only preflight: detect collisions before creating receipt files or finance rows.
  for (let index = 0; index < students.length; index += 1) {
    const student = students[index];
    const scenario = scenarios[index % scenarios.length];
    const scenarioKey = scenario.key + '-' + String(index + 1).padStart(3, '0');
    if (await hasFixture(student.id, scenarioKey)) continue;

    const conflictingRegistration = await prisma.registration.findFirst({
      where: {
        nationalId: student.nationalId,
        reviewHistory: { none: { action: FIXTURE_ACTION, note: scenarioKey } },
      },
      select: { id: true },
    });
    if (conflictingRegistration) {
      throw new Error('برای ' + student.nationalId + ' ثبت‌نامی خارج از این مجموعه وجود دارد؛ هیچ داده مالی ساخته نشد.');
    }
  }

  await ensureReceiptFile();

  const results = [];
  for (let index = 0; index < students.length; index += 1) {
    const scenario = scenarios[index % scenarios.length];
    results.push(await createFixture(students[index], course, scenario, index + 1));
  }

  const created = results.filter((item) => item.result !== 'already exists').length;
  const skipped = results.length - created;
  process.stdout.write(JSON.stringify({
    mode: 'FINANCE_LOAD_FIXTURE_COMPLETE',
    batch,
    studentCount: students.length,
    registrationCount: results.length,
    createdRegistrationCount: created,
    skippedExistingRegistrationCount: skipped,
    course,
    scenarioDistribution: scenarios.map((scenario) => ({
      scenario: scenario.key,
      count: students.filter((_, index) => scenarios[index % scenarios.length].key === scenario.key).length,
    })),
    results,
  }, null, 2) + '\n');
}

main()
  .catch((error) => {
    process.stderr.write(String(error instanceof Error ? error.message : error) + '\n');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
