ALTER TABLE "Book"
ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "Book_isActive_archivedAt_displayOrder_idx"
ON "Book"("isActive", "archivedAt", "displayOrder");
