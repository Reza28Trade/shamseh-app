import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';

const prisma = new PrismaClient();

const count = Math.max(1, Math.min(Number(process.env.TEST_STUDENT_COUNT || 100), 500));
const courseId = process.env.TEST_COURSE_ID;

async function main() {
  if (!courseId) {
    throw new Error('TEST_COURSE_ID is required.');
  }

  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true, title: true } });
  if (!course) throw new Error('Course not found: ' + courseId);

  const passwordHash = await argon2.hash('09120000000');

  for (let i = 1; i <= count; i += 1) {
    const suffix = String(i).padStart(3, '0');
    const nationalId = 'TEST' + suffix;
    const fullName = 'هنرجوی تست ' + suffix;
    const phone = '0912000' + String(i).padStart(4, '0');

    const user = await prisma.user.upsert({
      where: { username: nationalId },
      update: {
        passwordHash,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
      },
      create: {
        username: nationalId,
        passwordHash,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
      },
    });

    const student = await prisma.student.upsert({
      where: { userId: user.id },
      update: { fullName, nationalId, phone },
      create: { userId: user.id, fullName, nationalId, phone },
    });

    await prisma.enrollment.upsert({
      where: { studentId_courseId: { studentId: student.id, courseId } },
      update: { status: 'ACTIVE' },
      create: { studentId: student.id, courseId, status: 'ACTIVE' },
    });
  }

  console.log('Created/updated ' + count + ' test students and enrolled them in: ' + course.title);
  console.log('Test national IDs: TEST001 ... TEST' + String(count).padStart(3, '0'));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
