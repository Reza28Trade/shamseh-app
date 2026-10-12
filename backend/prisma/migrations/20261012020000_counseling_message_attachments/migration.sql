ALTER TABLE "CounselingMessage"
  ADD COLUMN "attachmentStorageKey" TEXT,
  ADD COLUMN "attachmentName" TEXT,
  ADD COLUMN "attachmentMimeType" TEXT,
  ADD COLUMN "attachmentSize" INTEGER;

CREATE UNIQUE INDEX "CounselingMessage_attachmentStorageKey_key"
  ON "CounselingMessage" ("attachmentStorageKey")
  WHERE "attachmentStorageKey" IS NOT NULL;
