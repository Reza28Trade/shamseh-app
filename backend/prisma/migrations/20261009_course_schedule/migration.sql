ALTER TABLE "Course"
ADD COLUMN "coverImageStorageKey" TEXT,
ADD COLUMN "academicYear" INTEGER,
ADD COLUMN "classDays" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "classStartTime" TEXT,
ADD COLUMN "classEndTime" TEXT;
