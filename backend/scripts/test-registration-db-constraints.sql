-- Regression test for the partial unique index protecting open registrations.
-- Runs only against the disposable PostgreSQL service in GitHub Actions.
BEGIN;

DO $$
DECLARE
  duplicate_blocked BOOLEAN := FALSE;
BEGIN
  INSERT INTO "Registration"
    ("id", "applicantFullName", "nationalId", "phone", "academicLevel", "fieldCode", "originalTuition", "finalTuition", "status")
  VALUES
    ('ci-open-registration-1', 'CI Test', 'CI-REGISTRATION-UNIQUE-TEST', '0000000000', 'MASTER', 'CI', 100, 100, 'PENDING_REVIEW');

  BEGIN
    INSERT INTO "Registration"
      ("id", "applicantFullName", "nationalId", "phone", "academicLevel", "fieldCode", "originalTuition", "finalTuition", "status")
    VALUES
      ('ci-open-registration-2', 'CI Test', 'CI-REGISTRATION-UNIQUE-TEST', '0000000000', 'MASTER', 'CI', 100, 100, 'PENDING_REVIEW');
  EXCEPTION WHEN unique_violation THEN
    duplicate_blocked := TRUE;
  END;

  IF NOT duplicate_blocked THEN
    RAISE EXCEPTION 'The database allowed two PENDING_REVIEW registrations for one national ID';
  END IF;

  -- NEEDS_CORRECTION is still open and must be covered by the same constraint.
  UPDATE "Registration"
  SET "status" = 'NEEDS_CORRECTION'
  WHERE "id" = 'ci-open-registration-1';

  duplicate_blocked := FALSE;
  BEGIN
    INSERT INTO "Registration"
      ("id", "applicantFullName", "nationalId", "phone", "academicLevel", "fieldCode", "originalTuition", "finalTuition", "status")
    VALUES
      ('ci-open-registration-3', 'CI Test', 'CI-REGISTRATION-UNIQUE-TEST', '0000000000', 'MASTER', 'CI', 100, 100, 'PENDING_REVIEW');
  EXCEPTION WHEN unique_violation THEN
    duplicate_blocked := TRUE;
  END;

  IF NOT duplicate_blocked THEN
    RAISE EXCEPTION 'The database allowed a new open registration while the previous one needed correction';
  END IF;

  -- A rejected registration is terminal and must not block a fresh attempt.
  UPDATE "Registration"
  SET "status" = 'REJECTED'
  WHERE "id" = 'ci-open-registration-1';

  INSERT INTO "Registration"
    ("id", "applicantFullName", "nationalId", "phone", "academicLevel", "fieldCode", "originalTuition", "finalTuition", "status")
  VALUES
    ('ci-terminal-registration-1', 'CI Test', 'CI-REGISTRATION-UNIQUE-TEST', '0000000000', 'MASTER', 'CI', 100, 100, 'PENDING_REVIEW');
END $$;

ROLLBACK;
