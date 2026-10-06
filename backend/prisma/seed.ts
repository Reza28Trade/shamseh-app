import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const username = process.env.SEED_ADMIN_USERNAME;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!username || !password) {
    throw new Error('SEED_ADMIN_USERNAME and SEED_ADMIN_PASSWORD are required.');
  }

  if (password.length < 12) {
    throw new Error('SEED_ADMIN_PASSWORD must be at least 12 characters.');
  }

  const passwordHash = await argon2.hash(password);

  await prisma.user.upsert({
    where: { username },
    update: {
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      status: 'ACTIVE',
    },
    create: {
      username,
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      status: 'ACTIVE',
    },
  });

  console.log('Super admin seed completed.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
