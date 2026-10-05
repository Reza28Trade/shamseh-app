# Shamseh Backend

Backend API for Shamseh.

## Stack

- NestJS
- TypeScript
- Prisma
- PostgreSQL

## Local setup

1. Copy .env.example to .env.
2. Set DATABASE_URL.
3. Install dependencies with npm install.
4. Generate Prisma Client with npm run prisma:generate.
5. Create the first database migration with npm run prisma:migrate.
6. Start development server with npm run start:dev.

The API is served under /api.
