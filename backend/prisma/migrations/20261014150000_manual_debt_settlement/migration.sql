ALTER TABLE "Registration"
  ADD COLUMN "manualSettlementAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "manualSettledAt" TIMESTAMP(3),
  ADD COLUMN "manualSettlementNote" TEXT,
  ADD COLUMN "manualSettledById" TEXT;

CREATE INDEX "Registration_manualSettledById_idx" ON "Registration"("manualSettledById");

ALTER TABLE "Registration"
  ADD CONSTRAINT "Registration_manualSettledById_fkey"
  FOREIGN KEY ("manualSettledById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
