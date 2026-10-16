CREATE TYPE "UserRole_new" AS ENUM ('SUPER_ADMIN', 'STAFF', 'STUDENT', 'COUNSELOR');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
DROP TYPE "UserRole";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";

CREATE TABLE "CounselorProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "bio" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CounselorProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CounselorProfile_userId_key" ON "CounselorProfile"("userId");
CREATE INDEX "CounselorProfile_isActive_displayName_idx" ON "CounselorProfile"("isActive", "displayName");
ALTER TABLE "CounselorProfile" ADD CONSTRAINT "CounselorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "CounselingAssignment" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "counselorId" TEXT NOT NULL,
  "assignedById" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CounselingAssignment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CounselingAssignment_studentId_endedAt_idx" ON "CounselingAssignment"("studentId", "endedAt");
CREATE INDEX "CounselingAssignment_counselorId_endedAt_idx" ON "CounselingAssignment"("counselorId", "endedAt");
CREATE INDEX "CounselingAssignment_assignedById_createdAt_idx" ON "CounselingAssignment"("assignedById", "createdAt");
ALTER TABLE "CounselingAssignment" ADD CONSTRAINT "CounselingAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CounselingAssignment" ADD CONSTRAINT "CounselingAssignment_counselorId_fkey" FOREIGN KEY ("counselorId") REFERENCES "CounselorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CounselingAssignment" ADD CONSTRAINT "CounselingAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "CounselingConversation" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "counselorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CounselingConversation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CounselingConversation_studentId_counselorId_key" ON "CounselingConversation"("studentId", "counselorId");
CREATE INDEX "CounselingConversation_studentId_updatedAt_idx" ON "CounselingConversation"("studentId", "updatedAt");
CREATE INDEX "CounselingConversation_counselorId_updatedAt_idx" ON "CounselingConversation"("counselorId", "updatedAt");
ALTER TABLE "CounselingConversation" ADD CONSTRAINT "CounselingConversation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CounselingConversation" ADD CONSTRAINT "CounselingConversation_counselorId_fkey" FOREIGN KEY ("counselorId") REFERENCES "CounselorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "CounselingMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "senderUserId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CounselingMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CounselingMessage_conversationId_createdAt_idx" ON "CounselingMessage"("conversationId", "createdAt");
CREATE INDEX "CounselingMessage_senderUserId_createdAt_idx" ON "CounselingMessage"("senderUserId", "createdAt");
ALTER TABLE "CounselingMessage" ADD CONSTRAINT "CounselingMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "CounselingConversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CounselingMessage" ADD CONSTRAINT "CounselingMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Enforce at most one active counselor assignment per student at the database level.
CREATE UNIQUE INDEX "CounselingAssignment_one_active_per_student_idx"
ON "CounselingAssignment" ("studentId") WHERE "endedAt" IS NULL;
