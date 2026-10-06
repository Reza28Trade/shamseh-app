-- Mock exams: Shamseh manages exam information and external exam access only.
-- Registration, questions, scoring, results, and exam administration remain on the external exam platform.

ALTER TYPE "NotificationType" ADD VALUE 'MOCK_EXAM';
ALTER TYPE "NotificationType" ADD VALUE 'MOCK_EXAM_DATE_CHANGED';
ALTER TYPE "NotificationType" ADD VALUE 'MOCK_EXAM_LINK_AVAILABLE';

CREATE TYPE "MockExamStatus" AS ENUM (
  'DRAFT',
  'SCHEDULED',
  'LINK_AVAILABLE',
  'LIVE',
  'COMPLETED',
  'CANCELLED'
);

CREATE TABLE "MockExam" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "field" TEXT NOT NULL,
  "description" TEXT,
  "examDate" TIMESTAMP(3) NOT NULL,
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

ALTER TABLE "MockExamCourse"
  ADD CONSTRAINT "MockExamCourse_mockExamId_fkey"
  FOREIGN KEY ("mockExamId") REFERENCES "MockExam"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MockExamCourse"
  ADD CONSTRAINT "MockExamCourse_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
