CREATE TYPE "PublicContentType" AS ENUM ('RULES', 'EXAM_ANALYSIS');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CARD', 'OTHER');

ALTER TABLE "Enrollment" ADD COLUMN "tuitionAmount" DECIMAL(12,2);

ALTER TABLE "MockExam" ADD COLUMN "description" TEXT;

CREATE TABLE "MockExamCourse" (
    "mockExamId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    CONSTRAINT "MockExamCourse_pkey" PRIMARY KEY ("mockExamId", "courseId")
);

ALTER TABLE "Payment"
  ADD COLUMN "method" "PaymentMethod" NOT NULL DEFAULT 'OTHER',
  ADD COLUMN "reference" TEXT,
  ADD COLUMN "note" TEXT,
  ADD COLUMN "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "createdById" TEXT;

CREATE TABLE "PublicContent" (
    "id" TEXT NOT NULL,
    "type" "PublicContentType" NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "content" TEXT NOT NULL,
    "examYear" TEXT,
    "examLevel" TEXT,
    "resourceUrl" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,
    CONSTRAINT "PublicContent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PublicContent_slug_key" ON "PublicContent"("slug");
CREATE INDEX "PublicContent_type_published_sortOrder_idx" ON "PublicContent"("type", "published", "sortOrder");
CREATE INDEX "PublicContent_examYear_examLevel_idx" ON "PublicContent"("examYear", "examLevel");
CREATE INDEX "MockExamCourse_courseId_idx" ON "MockExamCourse"("courseId");
CREATE INDEX "Payment_studentId_paidAt_idx" ON "Payment"("studentId", "paidAt");
CREATE INDEX "Payment_createdById_createdAt_idx" ON "Payment"("createdById", "createdAt");

ALTER TABLE "MockExamCourse" ADD CONSTRAINT "MockExamCourse_mockExamId_fkey"
  FOREIGN KEY ("mockExamId") REFERENCES "MockExam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MockExamCourse" ADD CONSTRAINT "MockExamCourse_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PublicContent" ADD CONSTRAINT "PublicContent_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
