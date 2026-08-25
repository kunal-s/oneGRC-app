ALTER TABLE "SourceProvision"
ADD COLUMN "notApplicableAt" TIMESTAMP(3),
ADD COLUMN "notApplicableById" TEXT,
ADD COLUMN "notApplicableReason" TEXT,
ADD COLUMN "specialistEngagedAt" TIMESTAMP(3),
ADD COLUMN "specialistEngagedById" TEXT;

ALTER TABLE "SourceProvision"
ADD CONSTRAINT "SourceProvision_notApplicableById_fkey"
FOREIGN KEY ("notApplicableById") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE,
ADD CONSTRAINT "SourceProvision_specialistEngagedById_fkey"
FOREIGN KEY ("specialistEngagedById") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;