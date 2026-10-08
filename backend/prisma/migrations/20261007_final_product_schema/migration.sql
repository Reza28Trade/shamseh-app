-- Final Shamseh product schema.
-- Adds public past exams, counseling, books, payment receipts,
-- general content, achievements, and student-specific mock exam access.
-- Removes the obsolete course relation from mock exams.

CREATE TYPE "CounselingSlotStatus" AS ENUM ('AVAILABLE', 'BOOKED', 'DISABLED');

CREATE TYPE "CounselingRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED');

CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TYPE "PaymentPurpose" AS ENUM ('COURSE_FEE', 'BOOK', 'MOCK_EXAM', 'OTHER');

ALTER TABLE "MockExamCourse" DROP CONSTRAINT "MockExamCourse_courseId_fkey";
ALTER TABLE "MockExamCourse" DROP CONSTRAINT "MockExamCourse_mockExamId_fkey";

ALTER TABLE "MockExam" DROP COLUMN "description";

DROP TABLE "MockExamCourse";

CREATE TABLE "MockExamParticipant" (
    "mockExamId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MockExamParticipant_pkey" PRIMARY KEY ("mockExamId","studentId")
);

CREATE TABLE "PastExam" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "level" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PastExam_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PastExamCode" (
    "id" TEXT NOT NULL,
    "pastExamId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "fieldCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PastExamCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PastExamQuestion" (
    "id" TEXT NOT NULL,
    "pastExamCodeId" TEXT NOT NULL,
    "questionNumber" INTEGER NOT NULL,
    "explanation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PastExamQuestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CounselingSlot" (
    "id" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "status" "CounselingSlotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CounselingSlot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CounselingRequest" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "status" "CounselingRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CounselingRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "category" TEXT,
    "price" DECIMAL(12,2),
    "discountedPrice" DECIMAL(12,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT,
    "bookId" TEXT,
    "purpose" "PaymentPurpose" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "trackingCode" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentReceipt" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" BIGINT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentReceipt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GeneralContent" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneralContent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "level" TEXT,
    "field" TEXT,
    "university" TEXT,
    "rank" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MockExamParticipant_studentId_idx" ON "MockExamParticipant"("studentId");

CREATE INDEX "PastExam_year_level_idx" ON "PastExam"("year","level");

CREATE INDEX "PastExamCode_fieldCode_idx" ON "PastExamCode"("fieldCode");

CREATE UNIQUE INDEX "PastExamCode_pastExamId_fieldCode_key" ON "PastExamCode"("pastExamId","fieldCode");

CREATE INDEX "PastExamQuestion_pastExamCodeId_idx" ON "PastExamQuestion"("pastExamCodeId");

CREATE UNIQUE INDEX "PastExamQuestion_pastExamCodeId_questionNumber_key" ON "PastExamQuestion"("pastExamCodeId","questionNumber");

CREATE INDEX "CounselingSlot_startAt_status_idx" ON "CounselingSlot"("startAt","status");

CREATE INDEX "CounselingRequest_studentId_status_idx" ON "CounselingRequest"("studentId","status");

CREATE UNIQUE INDEX "CounselingRequest_slotId_key" ON "CounselingRequest"("slotId");

CREATE INDEX "Book_isActive_displayOrder_idx" ON "Book"("isActive","displayOrder");

CREATE INDEX "Payment_studentId_status_idx" ON "Payment"("studentId","status");

CREATE INDEX "Payment_courseId_idx" ON "Payment"("courseId");

CREATE INDEX "Payment_bookId_idx" ON "Payment"("bookId");

CREATE INDEX "Payment_paymentDate_idx" ON "Payment"("paymentDate");

CREATE INDEX "PaymentReceipt_paymentId_uploadedAt_idx" ON "PaymentReceipt"("paymentId","uploadedAt");

CREATE UNIQUE INDEX "GeneralContent_key_key" ON "GeneralContent"("key");

CREATE INDEX "Achievement_isActive_year_displayOrder_idx" ON "Achievement"("isActive","year","displayOrder");

ALTER TABLE "MockExamParticipant"
  ADD CONSTRAINT "MockExamParticipant_mockExamId_fkey"
  FOREIGN KEY ("mockExamId") REFERENCES "MockExam"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MockExamParticipant"
  ADD CONSTRAINT "MockExamParticipant_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PastExamCode"
  ADD CONSTRAINT "PastExamCode_pastExamId_fkey"
  FOREIGN KEY ("pastExamId") REFERENCES "PastExam"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PastExamQuestion"
  ADD CONSTRAINT "PastExamQuestion_pastExamCodeId_fkey"
  FOREIGN KEY ("pastExamCodeId") REFERENCES "PastExamCode"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CounselingRequest"
  ADD CONSTRAINT "CounselingRequest_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CounselingRequest"
  ADD CONSTRAINT "CounselingRequest_slotId_fkey"
  FOREIGN KEY ("slotId") REFERENCES "CounselingSlot"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_bookId_fkey"
  FOREIGN KEY ("bookId") REFERENCES "Book"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_reviewedBy_fkey"
  FOREIGN KEY ("reviewedBy") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PaymentReceipt"
  ADD CONSTRAINT "PaymentReceipt_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GeneralContent"
  ADD CONSTRAINT "GeneralContent_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
