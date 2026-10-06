-- Mock exams domain: external exam platform, internal registrations, and targeted notifications.
ALTER TYPE "NotificationType" ADD VALUE 'MOCK_EXAM';
ALTER TYPE "NotificationType" ADD VALUE 'MOCK_EXAM_DATE_CHANGED';
ALTER TYPE "NotificationType" ADD VALUE 'MOCK_EXAM_LINK_AVAILABLE';

CREATE TYPE "MockExamStatus" AS ENUM (
  'DRAFT',
  'OPEN_FOR_REGISTRATION',
  'REGISTRATION_CLOSED',
  'SCHEDULED',
  'LINK_AVAILABLE',
  'LIVE',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE "MockExamRegistrationStatus" AS ENUM ('ACTIVE', 'CANCELLED');

CREATE TABLE "MockExam" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "field" TEXT NOT NULL,
  "description" TEXT,
  "registrationStartsAt" TIMESTAMP(3),
  "registrationEndsAt" TIMESTAMP(3),
  "examDate" TIMESTAMP(3) NOT NULL,
  "registrationUrl" TEXT,
  "examUrl" TEXT,
  "status" "MockExamStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MockExam_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MockExam_status_examDate_idx" ON "MockExam"("status", "examDate");
CREATE INDEX "MockExam_level_field_idx" ON "MockExam"("level", "field");

CREATE TABLE "MockExamCourse" (
  "mockExamId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  CONSTRAINT "MockExamCourse_pkey" PRIMARY KEY ("mockExamId", "courseId")
);

CREATE INDEX "MockExamCourse_courseId_idx" ON "MockExamCourse"("courseId");

CREATE TABLE "MockExamRegistration" (
  "id" TEXT NOT NULL,
  "mockExamId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "status" "MockExamRegistrationStatus" NOT NULL DEFAULT 'ACTIVE',
  "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MockExamRegistration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MockExamRegistration_mockExamId_studentId_key"
  ON "MockExamRegistration"("mockExamId", "studentId");
CREATE INDEX "MockExamRegistration_studentId_status_idx"
  ON "MockExamRegistration"("studentId", "status");

ALTER TABLE "MockExamCourse"
  ADD CONSTRAINT "MockExamCourse_mockExamId_fkey"
  FOREIGN KEY ("mockExamId") REFERENCES "MockExam"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MockExamCourse"
  ADD CONSTRAINT "MockExamCourse_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MockExamRegistration"
  ADD CONSTRAINT "MockExamRegistration_mockExamId_fkey"
  FOREIGN KEY ("mockExamId") REFERENCES "MockExam"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MockExamRegistration"
  ADD CONSTRAINT "MockExamRegistration_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
