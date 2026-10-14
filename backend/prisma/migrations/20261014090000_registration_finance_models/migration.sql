-- Registration workflow and finance ledger models.
-- Existing Payment and PaymentReceipt tables are intentionally preserved.

-- StudentLevel exists in the Prisma schema but may be absent in fresh databases
-- because it was previously added manually in some environments.
DO $studentlevel$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StudentLevel') THEN
    CREATE TYPE "StudentLevel" AS ENUM ('MASTER', 'DOCTORATE');
  END IF;
END;
$studentlevel$;
ALTER TYPE "StudentLevel" ADD VALUE IF NOT EXISTS 'MASTER';
ALTER TYPE "StudentLevel" ADD VALUE IF NOT EXISTS 'DOCTORATE';

CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING_REVIEW', 'NEEDS_CORRECTION', 'APPROVED', 'REJECTED');
CREATE TYPE "RegistrationApprovalMode" AS ENUM ('NORMAL', 'DISCOUNT', 'PAYMENT_EXCEPTION');
CREATE TYPE "RegistrationPaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "RegistrationPaymentPurpose" AS ENUM ('INITIAL', 'INSTALLMENT');
CREATE TYPE "InstallmentStatus" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE');
CREATE TYPE "RefundRequestStatus" AS ENUM ('REQUESTED', 'RESERVED', 'PAID', 'REJECTED');

CREATE TABLE "Registration" (
  "id" TEXT NOT NULL,
  "applicantFullName" TEXT NOT NULL,
  "nationalId" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "academicLevel" "StudentLevel" NOT NULL,
  "fieldCode" TEXT NOT NULL,
  "studentId" TEXT,
  "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "approvalMode" "RegistrationApprovalMode",
  "originalTuition" DECIMAL(12,2) NOT NULL,
  "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "finalTuition" DECIMAL(12,2) NOT NULL,
  "discountReason" TEXT,
  "exceptionReason" TEXT,
  "reviewNote" TEXT,
  "mockExamEligible" BOOLEAN,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Registration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RegistrationCourse" (
  "id" TEXT NOT NULL,
  "registrationId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "courseTitleSnapshot" TEXT NOT NULL,
  "coursePriceSnapshot" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RegistrationCourse_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RegistrationPayment" (
  "id" TEXT NOT NULL,
  "registrationId" TEXT NOT NULL,
  "purpose" "RegistrationPaymentPurpose" NOT NULL,
  "status" "RegistrationPaymentStatus" NOT NULL DEFAULT 'PENDING',
  "claimedAmount" DECIMAL(12,2) NOT NULL,
  "approvedAmount" DECIMAL(12,2),
  "paymentDate" TIMESTAMP(3) NOT NULL,
  "method" "PaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
  "trackingCode" TEXT,
  "reference" TEXT,
  "reviewNote" TEXT,
  "rejectionReason" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RegistrationPayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RegistrationPaymentReceipt" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSize" BIGINT,
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "uploaderUserId" TEXT,
  CONSTRAINT "RegistrationPaymentReceipt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Installment" (
  "id" TEXT NOT NULL,
  "registrationId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "status" "InstallmentStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Installment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentAllocation" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "installmentId" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RefundRequest" (
  "id" TEXT NOT NULL,
  "registrationId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "amountRequested" DECIMAL(12,2) NOT NULL,
  "amountReserved" DECIMAL(12,2),
  "status" "RefundRequestStatus" NOT NULL DEFAULT 'REQUESTED',
  "reason" TEXT NOT NULL,
  "reviewNote" TEXT,
  "transferReference" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "paidById" TEXT,
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RefundRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Registration_nationalId_status_idx" ON "Registration"("nationalId", "status");
CREATE INDEX "Registration_studentId_status_idx" ON "Registration"("studentId", "status");
CREATE INDEX "Registration_status_createdAt_idx" ON "Registration"("status", "createdAt");
CREATE UNIQUE INDEX "Registration_one_open_per_nationalId_key"
  ON "Registration"("nationalId")
  WHERE "status" IN ('PENDING_REVIEW', 'NEEDS_CORRECTION');

CREATE UNIQUE INDEX "RegistrationCourse_registrationId_courseId_key" ON "RegistrationCourse"("registrationId", "courseId");
CREATE INDEX "RegistrationCourse_courseId_idx" ON "RegistrationCourse"("courseId");

CREATE INDEX "RegistrationPayment_registrationId_status_idx" ON "RegistrationPayment"("registrationId", "status");
CREATE INDEX "RegistrationPayment_purpose_status_idx" ON "RegistrationPayment"("purpose", "status");
CREATE INDEX "RegistrationPayment_reviewedById_reviewedAt_idx" ON "RegistrationPayment"("reviewedById", "reviewedAt");
CREATE INDEX "RegistrationPaymentReceipt_paymentId_uploadedAt_idx" ON "RegistrationPaymentReceipt"("paymentId", "uploadedAt");

CREATE UNIQUE INDEX "Installment_registrationId_sequence_key" ON "Installment"("registrationId", "sequence");
CREATE INDEX "Installment_dueDate_status_idx" ON "Installment"("dueDate", "status");
CREATE INDEX "Installment_registrationId_status_idx" ON "Installment"("registrationId", "status");

CREATE UNIQUE INDEX "PaymentAllocation_paymentId_installmentId_key" ON "PaymentAllocation"("paymentId", "installmentId");
CREATE INDEX "PaymentAllocation_installmentId_idx" ON "PaymentAllocation"("installmentId");

CREATE INDEX "RefundRequest_studentId_status_idx" ON "RefundRequest"("studentId", "status");
CREATE INDEX "RefundRequest_registrationId_status_idx" ON "RefundRequest"("registrationId", "status");
CREATE INDEX "RefundRequest_status_requestedAt_idx" ON "RefundRequest"("status", "requestedAt");

ALTER TABLE "Registration" ADD CONSTRAINT "Registration_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RegistrationCourse" ADD CONSTRAINT "RegistrationCourse_registrationId_fkey"
  FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RegistrationCourse" ADD CONSTRAINT "RegistrationCourse_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RegistrationPayment" ADD CONSTRAINT "RegistrationPayment_registrationId_fkey"
  FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RegistrationPayment" ADD CONSTRAINT "RegistrationPayment_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RegistrationPaymentReceipt" ADD CONSTRAINT "RegistrationPaymentReceipt_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "RegistrationPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Installment" ADD CONSTRAINT "Installment_registrationId_fkey"
  FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "RegistrationPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_installmentId_fkey"
  FOREIGN KEY ("installmentId") REFERENCES "Installment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_registrationId_fkey"
  FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_paidById_fkey"
  FOREIGN KEY ("paidById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Preserve the field/major code on the student and retain reviewer history.
ALTER TABLE "Student" ADD COLUMN "fieldCode" TEXT;

CREATE TABLE "RegistrationReviewHistory" (
  "id" TEXT NOT NULL,
  "registrationId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "action" TEXT NOT NULL,
  "fromStatus" "RegistrationStatus",
  "toStatus" "RegistrationStatus",
  "note" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RegistrationReviewHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RegistrationReviewHistory_registrationId_createdAt_idx"
  ON "RegistrationReviewHistory"("registrationId", "createdAt");
CREATE INDEX "RegistrationReviewHistory_actorUserId_createdAt_idx"
  ON "RegistrationReviewHistory"("actorUserId", "createdAt");
ALTER TABLE "RegistrationReviewHistory" ADD CONSTRAINT "RegistrationReviewHistory_registrationId_fkey"
  FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RegistrationReviewHistory" ADD CONSTRAINT "RegistrationReviewHistory_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "StudentProfileHistory" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "changedById" TEXT,
  "fieldName" TEXT NOT NULL,
  "oldValue" TEXT,
  "newValue" TEXT,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentProfileHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StudentProfileHistory_studentId_createdAt_idx"
  ON "StudentProfileHistory"("studentId", "createdAt");
CREATE INDEX "StudentProfileHistory_changedById_createdAt_idx"
  ON "StudentProfileHistory"("changedById", "createdAt");
ALTER TABLE "StudentProfileHistory" ADD CONSTRAINT "StudentProfileHistory_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentProfileHistory" ADD CONSTRAINT "StudentProfileHistory_changedById_fkey"
  FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Database-level sanity checks for monetary values.
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_tuition_nonnegative_check"
  CHECK ("originalTuition" >= 0 AND "discountAmount" >= 0 AND "discountAmount" <= "originalTuition" AND "finalTuition" = "originalTuition" - "discountAmount");
ALTER TABLE "RegistrationPayment" ADD CONSTRAINT "RegistrationPayment_claimed_positive_check"
  CHECK ("claimedAmount" > 0 AND ("approvedAmount" IS NULL OR "approvedAmount" > 0));
ALTER TABLE "Installment" ADD CONSTRAINT "Installment_amount_positive_check" CHECK ("amount" > 0);
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_amount_positive_check" CHECK ("amount" > 0);
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_amount_positive_check"
  CHECK ("amountRequested" > 0 AND ("amountReserved" IS NULL OR "amountReserved" > 0));


-- Idempotent reminder scheduling state for installment due-date notifications.
ALTER TABLE "Installment" ADD COLUMN "lastReminderAt" TIMESTAMP(3);
ALTER TABLE "Installment" ADD COLUMN "lastReminderType" TEXT;
CREATE INDEX "Installment_lastReminderAt_status_idx" ON "Installment"("lastReminderAt", "status");

ALTER TABLE "Student" ADD COLUMN "freeMockExamEligible" BOOLEAN NOT NULL DEFAULT false;

-- Enforce one unresolved registration per national ID even under concurrent public submissions.
CREATE UNIQUE INDEX "Registration_one_open_per_nationalId_key"
  ON "Registration" ("nationalId")
  WHERE "status" IN ('PENDING_REVIEW', 'NEEDS_CORRECTION');
