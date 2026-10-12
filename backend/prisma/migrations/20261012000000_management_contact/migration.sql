CREATE TABLE "ManagementContactTicket" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ManagementContactTicket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ManagementContactMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ManagementContactMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ManagementContactTicket_studentId_status_idx"
ON "ManagementContactTicket"("studentId", "status");

CREATE INDEX "ManagementContactMessage_ticketId_createdAt_idx"
ON "ManagementContactMessage"("ticketId", "createdAt");

ALTER TABLE "ManagementContactTicket"
ADD CONSTRAINT "ManagementContactTicket_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ManagementContactMessage"
ADD CONSTRAINT "ManagementContactMessage_ticketId_fkey"
FOREIGN KEY ("ticketId") REFERENCES "ManagementContactTicket"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ManagementContactMessage"
ADD CONSTRAINT "ManagementContactMessage_senderUserId_fkey"
FOREIGN KEY ("senderUserId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
