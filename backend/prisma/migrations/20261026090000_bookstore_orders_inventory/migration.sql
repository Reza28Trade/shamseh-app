CREATE TYPE "BookOrderStatus" AS ENUM ('RESERVED', 'AWAITING_RECEIPT', 'PAYMENT_REVIEW', 'PAYMENT_REJECTED', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'REFUND_PENDING', 'REFUNDED', 'CANCELLED');
CREATE TYPE "BookRefundStatus" AS ENUM ('NONE', 'REQUESTED', 'COMPLETED');

ALTER TABLE "Book"
  ADD COLUMN "stockQuantity" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "reservedQuantity" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "BookOrder" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "status" "BookOrderStatus" NOT NULL DEFAULT 'RESERVED',
  "refundStatus" "BookRefundStatus" NOT NULL DEFAULT 'NONE',
  "refundFromStatus" "BookOrderStatus",
  "recipientName" TEXT NOT NULL,
  "recipientPhone" TEXT NOT NULL,
  "postalCode" TEXT NOT NULL,
  "shippingAddress" TEXT NOT NULL,
  "subtotal" DECIMAL(12,2) NOT NULL,
  "trackingCode" TEXT,
  "receiptStorageKey" TEXT,
  "receiptMimeType" TEXT,
  "receiptFileSize" BIGINT,
  "receiptUploadedAt" TIMESTAMP(3),
  "receiptRejectionReason" TEXT,
  "paymentReference" TEXT,
  "paymentSubmittedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  "shippedAt" TIMESTAMP(3),
  "shippedById" TEXT,
  "deliveredAt" TIMESTAMP(3),
  "refundRequestedAt" TIMESTAMP(3),
  "refundCompletedAt" TIMESTAMP(3),
  "refundById" TEXT,
  "refundNote" TEXT,
  "reservationExpiresAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BookOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BookOrderItem" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "bookId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPrice" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BookOrderItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BookOrder_studentId_status_createdAt_idx" ON "BookOrder"("studentId", "status", "createdAt");
CREATE INDEX "BookOrder_status_reservationExpiresAt_idx" ON "BookOrder"("status", "reservationExpiresAt");
CREATE INDEX "BookOrder_refundStatus_idx" ON "BookOrder"("refundStatus");
CREATE UNIQUE INDEX "BookOrderItem_orderId_bookId_key" ON "BookOrderItem"("orderId", "bookId");
CREATE INDEX "BookOrderItem_bookId_idx" ON "BookOrderItem"("bookId");

ALTER TABLE "BookOrder" ADD CONSTRAINT "BookOrder_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookOrder" ADD CONSTRAINT "BookOrder_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BookOrder" ADD CONSTRAINT "BookOrder_shippedById_fkey" FOREIGN KEY ("shippedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BookOrder" ADD CONSTRAINT "BookOrder_refundById_fkey" FOREIGN KEY ("refundById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BookOrderItem" ADD CONSTRAINT "BookOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "BookOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookOrderItem" ADD CONSTRAINT "BookOrderItem_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
