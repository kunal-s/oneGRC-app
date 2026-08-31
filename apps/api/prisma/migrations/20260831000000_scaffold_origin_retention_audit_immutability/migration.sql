-- SLICE-00 parts A and B: the origin enum becomes reference/sample/earned
-- (D-018, S00-170, S00-171), origin lands on nine more reference and
-- provenance tables (S00-172 to S00-175), the ten provenance foreign keys
-- from Person stop nulling on delete and start refusing it (S00-021, D-041),
-- the audit log refuses to be altered by anything but an append (S00-147,
-- REF-24), and a retention floor exists per store and cannot be lowered or
-- removed (S00-024, S00-150, D-040).

-- ---------------------------------------------------------------------------
-- A2: rename the Origin enum, backfilling ingested/user into earned in the
-- same migration. Only the ten columns that use the CURRENT three-value enum
-- go through this cast; the nine columns added below are created directly
-- against the renamed type and never held an old value.
-- ---------------------------------------------------------------------------
BEGIN;

CREATE TYPE "Origin_new" AS ENUM ('reference', 'sample', 'earned');

ALTER TABLE "Person" ALTER COLUMN "origin" DROP DEFAULT;
ALTER TABLE "Instrument" ALTER COLUMN "origin" DROP DEFAULT;
ALTER TABLE "SourceClause" ALTER COLUMN "origin" DROP DEFAULT;
ALTER TABLE "Control" ALTER COLUMN "origin" DROP DEFAULT;
ALTER TABLE "Obligation" ALTER COLUMN "origin" DROP DEFAULT;
ALTER TABLE "ObligationCycle" ALTER COLUMN "origin" DROP DEFAULT;
ALTER TABLE "Task" ALTER COLUMN "origin" DROP DEFAULT;
ALTER TABLE "Evidence" ALTER COLUMN "origin" DROP DEFAULT;
ALTER TABLE "Risk" ALTER COLUMN "origin" DROP DEFAULT;
ALTER TABLE "SourceProvision" ALTER COLUMN "origin" DROP DEFAULT;

ALTER TABLE "Person" ALTER COLUMN "origin" TYPE "Origin_new" USING (
  CASE "origin"::text WHEN 'ingested' THEN 'earned' WHEN 'user' THEN 'earned' ELSE "origin"::text END
)::"Origin_new";
ALTER TABLE "Instrument" ALTER COLUMN "origin" TYPE "Origin_new" USING (
  CASE "origin"::text WHEN 'ingested' THEN 'earned' WHEN 'user' THEN 'earned' ELSE "origin"::text END
)::"Origin_new";
ALTER TABLE "SourceClause" ALTER COLUMN "origin" TYPE "Origin_new" USING (
  CASE "origin"::text WHEN 'ingested' THEN 'earned' WHEN 'user' THEN 'earned' ELSE "origin"::text END
)::"Origin_new";
ALTER TABLE "Control" ALTER COLUMN "origin" TYPE "Origin_new" USING (
  CASE "origin"::text WHEN 'ingested' THEN 'earned' WHEN 'user' THEN 'earned' ELSE "origin"::text END
)::"Origin_new";
ALTER TABLE "Obligation" ALTER COLUMN "origin" TYPE "Origin_new" USING (
  CASE "origin"::text WHEN 'ingested' THEN 'earned' WHEN 'user' THEN 'earned' ELSE "origin"::text END
)::"Origin_new";
ALTER TABLE "ObligationCycle" ALTER COLUMN "origin" TYPE "Origin_new" USING (
  CASE "origin"::text WHEN 'ingested' THEN 'earned' WHEN 'user' THEN 'earned' ELSE "origin"::text END
)::"Origin_new";
ALTER TABLE "Task" ALTER COLUMN "origin" TYPE "Origin_new" USING (
  CASE "origin"::text WHEN 'ingested' THEN 'earned' WHEN 'user' THEN 'earned' ELSE "origin"::text END
)::"Origin_new";
ALTER TABLE "Evidence" ALTER COLUMN "origin" TYPE "Origin_new" USING (
  CASE "origin"::text WHEN 'ingested' THEN 'earned' WHEN 'user' THEN 'earned' ELSE "origin"::text END
)::"Origin_new";
ALTER TABLE "Risk" ALTER COLUMN "origin" TYPE "Origin_new" USING (
  CASE "origin"::text WHEN 'ingested' THEN 'earned' WHEN 'user' THEN 'earned' ELSE "origin"::text END
)::"Origin_new";
ALTER TABLE "SourceProvision" ALTER COLUMN "origin" TYPE "Origin_new" USING (
  CASE "origin"::text WHEN 'ingested' THEN 'earned' WHEN 'user' THEN 'earned' ELSE "origin"::text END
)::"Origin_new";

ALTER TYPE "Origin" RENAME TO "Origin_old";
ALTER TYPE "Origin_new" RENAME TO "Origin";
DROP TYPE "Origin_old";

ALTER TABLE "Person" ALTER COLUMN "origin" SET DEFAULT 'earned';
ALTER TABLE "Instrument" ALTER COLUMN "origin" SET DEFAULT 'earned';
ALTER TABLE "SourceClause" ALTER COLUMN "origin" SET DEFAULT 'earned';
ALTER TABLE "Control" ALTER COLUMN "origin" SET DEFAULT 'earned';
ALTER TABLE "Obligation" ALTER COLUMN "origin" SET DEFAULT 'earned';
ALTER TABLE "ObligationCycle" ALTER COLUMN "origin" SET DEFAULT 'earned';
ALTER TABLE "Task" ALTER COLUMN "origin" SET DEFAULT 'earned';
ALTER TABLE "Evidence" ALTER COLUMN "origin" SET DEFAULT 'earned';
ALTER TABLE "Risk" ALTER COLUMN "origin" SET DEFAULT 'earned';
ALTER TABLE "SourceProvision" ALTER COLUMN "origin" SET DEFAULT 'earned';

COMMIT;

-- ---------------------------------------------------------------------------
-- A3: origin lands on the reference tables (reference only, D-018) and on the
-- provenance tables data-model.md section 5 names (sample, earned).
-- ---------------------------------------------------------------------------
ALTER TABLE "Organization" ADD COLUMN "origin" "Origin" NOT NULL DEFAULT 'reference';
ALTER TABLE "OrganisationProfile" ADD COLUMN "origin" "Origin" NOT NULL DEFAULT 'reference';
ALTER TABLE "Role" ADD COLUMN "origin" "Origin" NOT NULL DEFAULT 'reference';
ALTER TABLE "ActionAuthority" ADD COLUMN "origin" "Origin" NOT NULL DEFAULT 'reference';

ALTER TABLE "Document" ADD COLUMN "origin" "Origin" NOT NULL DEFAULT 'earned';
ALTER TABLE "InstrumentRelation" ADD COLUMN "origin" "Origin" NOT NULL DEFAULT 'earned';
ALTER TABLE "ProvisionFlag" ADD COLUMN "origin" "Origin" NOT NULL DEFAULT 'earned';
ALTER TABLE "ClauseLink" ADD COLUMN "origin" "Origin" NOT NULL DEFAULT 'earned';
ALTER TABLE "PenaltyTier" ADD COLUMN "origin" "Origin" NOT NULL DEFAULT 'earned';

-- ---------------------------------------------------------------------------
-- A1: the retention floor. One row per store, a minimum period in years, and
-- a trigger (below) that refuses to shorten or delete it. Nothing reads this
-- table yet: no deletion path exists anywhere in the platform, and the floor
-- is laid now because it cannot be applied backwards to data already gone.
--
-- The years below are PLACEHOLDERS, not a customer decision: see DN-026 in
-- docs/decisions.md. The mechanism, the table and the trigger, is real from
-- this migration regardless of the number seeded; the number itself is the
-- customer's regulatory position to confirm before the first production
-- write, and the trigger permits raising it, never lowering it.
-- ---------------------------------------------------------------------------
CREATE TABLE "RetentionFloor" (
    "storeKey" VARCHAR(32) NOT NULL,
    "minimumYears" INTEGER,
    "note" TEXT NOT NULL,
    "origin" "Origin" NOT NULL DEFAULT 'reference',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetentionFloor_pkey" PRIMARY KEY ("storeKey")
);

CREATE OR REPLACE FUNCTION retention_floor_guard() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'The retention floor for "%" cannot be deleted.', OLD."storeKey";
  END IF;

  IF OLD."minimumYears" IS NOT NULL
     AND NEW."minimumYears" IS NOT NULL
     AND NEW."minimumYears" < OLD."minimumYears" THEN
    RAISE EXCEPTION 'The retention floor for "%" cannot be shortened below % years.', OLD."storeKey", OLD."minimumYears";
  END IF;

  IF OLD."minimumYears" IS NULL AND NEW."minimumYears" IS NOT NULL THEN
    RAISE EXCEPTION 'The retention floor for "%" cannot be shortened from indefinite retention.', OLD."storeKey";
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER retention_floor_no_shorten_no_delete
BEFORE UPDATE OR DELETE ON "RetentionFloor"
FOR EACH ROW EXECUTE FUNCTION retention_floor_guard();

-- ---------------------------------------------------------------------------
-- A4: the ten provenance foreign keys from Person stop nulling on delete and
-- start refusing it, so removing a person can never remove the record of
-- what they did (BR-LNK-10, D-041, S00-021, S00-148).
-- ---------------------------------------------------------------------------
ALTER TABLE "SourceClause" DROP CONSTRAINT "SourceClause_decidedById_fkey";
ALTER TABLE "SourceClause" ADD CONSTRAINT "SourceClause_decidedById_fkey"
  FOREIGN KEY ("decidedById") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SourceProvision" DROP CONSTRAINT "SourceProvision_promotedById_fkey";
ALTER TABLE "SourceProvision" ADD CONSTRAINT "SourceProvision_promotedById_fkey"
  FOREIGN KEY ("promotedById") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Obligation" DROP CONSTRAINT "Obligation_checkerId_fkey";
ALTER TABLE "Obligation" ADD CONSTRAINT "Obligation_checkerId_fkey"
  FOREIGN KEY ("checkerId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Task" DROP CONSTRAINT "Task_checkerId_fkey";
ALTER TABLE "Task" ADD CONSTRAINT "Task_checkerId_fkey"
  FOREIGN KEY ("checkerId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Evidence" DROP CONSTRAINT "Evidence_capturedById_fkey";
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_capturedById_fkey"
  FOREIGN KEY ("capturedById") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Evidence" DROP CONSTRAINT "Evidence_verifiedById_fkey";
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_verifiedById_fkey"
  FOREIGN KEY ("verifiedById") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AuditEntry" DROP CONSTRAINT "AuditEntry_actorId_fkey";
ALTER TABLE "AuditEntry" ADD CONSTRAINT "AuditEntry_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProvisionFlag" DROP CONSTRAINT "ProvisionFlag_ownerId_fkey";
ALTER TABLE "ProvisionFlag" ADD CONSTRAINT "ProvisionFlag_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProvisionFlag" DROP CONSTRAINT "ProvisionFlag_raisedById_fkey";
ALTER TABLE "ProvisionFlag" ADD CONSTRAINT "ProvisionFlag_raisedById_fkey"
  FOREIGN KEY ("raisedById") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProvisionFlag" DROP CONSTRAINT "ProvisionFlag_resolvedById_fkey";
ALTER TABLE "ProvisionFlag" ADD CONSTRAINT "ProvisionFlag_resolvedById_fkey"
  FOREIGN KEY ("resolvedById") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- A5: the database refuses an UPDATE or a DELETE on the audit log, rather
-- than the application merely not issuing one (AUD-03, FRD G-15, S00-147,
-- REF-24).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION audit_entry_append_only() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'The audit log is append only.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_entry_no_update_delete
BEFORE UPDATE OR DELETE ON "AuditEntry"
FOR EACH ROW EXECUTE FUNCTION audit_entry_append_only();
