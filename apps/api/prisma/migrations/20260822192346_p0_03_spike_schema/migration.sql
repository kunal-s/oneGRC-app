-- CreateEnum
CREATE TYPE "Origin" AS ENUM ('ingested', 'user', 'sample');

-- CreateEnum
CREATE TYPE "Department" AS ENUM ('ComplianceAndSecretarial', 'Risk', 'ITAndInformationSecurity', 'InvestmentCompliance', 'DataProtection', 'FinanceAndTax', 'HRAndLabour', 'InternalAudit');

-- CreateEnum
CREATE TYPE "LineOfDefence" AS ENUM ('First', 'Second', 'Third');

-- CreateEnum
CREATE TYPE "PersonStatus" AS ENUM ('Active', 'Away', 'Invited', 'Suspended');

-- CreateEnum
CREATE TYPE "InstrumentType" AS ENUM ('Act', 'Rules', 'Regulation', 'MasterCircular', 'Circular', 'Notification', 'Direction', 'Guidelines', 'Standard', 'Policy');

-- CreateEnum
CREATE TYPE "InstrumentStatus" AS ENUM ('InForce', 'Draft', 'Superseded', 'Repealed');

-- CreateEnum
CREATE TYPE "RetrievalMethod" AS ENUM ('fetched', 'manualUpload');

-- CreateEnum
CREATE TYPE "TextLayer" AS ENUM ('native', 'ocr', 'none');

-- CreateEnum
CREATE TYPE "InstrumentRelationKind" AS ENUM ('madeUnder', 'references', 'supersedes', 'amends');

-- CreateEnum
CREATE TYPE "ClauseState" AS ENUM ('Processing', 'Recommended', 'Saved', 'SpecialistReview', 'NotApplicable');

-- CreateEnum
CREATE TYPE "ExtractionMethod" AS ENUM ('structural', 'model', 'manual');

-- CreateEnum
CREATE TYPE "ClauseFlagKind" AS ENUM ('CadenceUnspecified', 'ConditionalApplicability', 'UnresolvedCrossReference', 'AmendedText', 'ProvisoPresent', 'DiscretionaryLanguage', 'LowExtractionConfidence');

-- CreateEnum
CREATE TYPE "FlagRaisedBy" AS ENUM ('system', 'person');

-- CreateEnum
CREATE TYPE "ClauseLinkKind" AS ENUM ('resolves', 'references', 'amends');

-- CreateEnum
CREATE TYPE "ControlType" AS ENUM ('Preventive', 'Detective');

-- CreateEnum
CREATE TYPE "ControlAutomation" AS ENUM ('CCM', 'Manual');

-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('Weekly', 'Fortnightly', 'Monthly', 'Quarterly', 'HalfYearly', 'Annual', 'EventBased', 'Continuous');

-- CreateEnum
CREATE TYPE "CycleState" AS ENUM ('Due', 'InReview', 'Filed');

-- CreateEnum
CREATE TYPE "CompletionPolicy" AS ENUM ('simple', 'acknowledge', 'evidence', 'makerChecker');

-- CreateEnum
CREATE TYPE "TaskState" AS ENUM ('Open', 'InProgress', 'Submitted', 'Returned', 'Done', 'Cancelled');

-- CreateEnum
CREATE TYPE "EvidenceKind" AS ENUM ('Screenshot', 'Log', 'ConfigExport', 'Attestation', 'FilingAck', 'Minute', 'Challan', 'Other');

-- CreateEnum
CREATE TYPE "EvidenceState" AS ENUM ('Submitted', 'Verified');

-- CreateEnum
CREATE TYPE "RiskDomain" AS ENUM ('IT', 'Cyber', 'Operational', 'Investment', 'Compliance', 'ThirdParty');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" VARCHAR(60) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "locale" TEXT NOT NULL DEFAULT 'en-IN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "email" TEXT,
    "department" "Department" NOT NULL,
    "lineOfDefence" "LineOfDefence" NOT NULL,
    "status" "PersonStatus" NOT NULL DEFAULT 'Active',
    "origin" "Origin" NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "code" VARCHAR(24) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "PersonRole" (
    "personId" TEXT NOT NULL,
    "roleCode" TEXT NOT NULL,

    CONSTRAINT "PersonRole_pkey" PRIMARY KEY ("personId","roleCode")
);

-- CreateTable
CREATE TABLE "ActionAuthority" (
    "action" VARCHAR(48) NOT NULL,
    "roleCode" VARCHAR(24) NOT NULL,
    "separationOfDuties" BOOLEAN NOT NULL DEFAULT false,
    "requiresDepartment" "Department",

    CONSTRAINT "ActionAuthority_pkey" PRIMARY KEY ("action","roleCode")
);

-- CreateTable
CREATE TABLE "Document" (
    "sha256" VARCHAR(64) NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "pageCount" INTEGER,
    "storedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("sha256")
);

-- CreateTable
CREATE TABLE "Instrument" (
    "id" VARCHAR(11) NOT NULL,
    "title" TEXT NOT NULL,
    "shortTitle" VARCHAR(60) NOT NULL,
    "citation" TEXT,
    "authority" TEXT NOT NULL,
    "jurisdiction" VARCHAR(8) NOT NULL,
    "type" "InstrumentType" NOT NULL,
    "issuedOn" DATE,
    "effectiveFrom" DATE,
    "status" "InstrumentStatus" NOT NULL DEFAULT 'InForce',
    "documentSha256" TEXT,
    "sourceUrl" TEXT,
    "retrievedAt" TIMESTAMP(3),
    "retrievalMethod" "RetrievalMethod",
    "textLayer" "TextLayer" NOT NULL DEFAULT 'native',
    "origin" "Origin" NOT NULL DEFAULT 'ingested',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Instrument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstrumentRelation" (
    "id" TEXT NOT NULL,
    "fromId" VARCHAR(11) NOT NULL,
    "toId" VARCHAR(11) NOT NULL,
    "kind" "InstrumentRelationKind" NOT NULL,
    "note" TEXT,

    CONSTRAINT "InstrumentRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceClause" (
    "id" VARCHAR(11) NOT NULL,
    "instrumentId" VARCHAR(11) NOT NULL,
    "clauseRef" VARCHAR(32) NOT NULL,
    "parentId" VARCHAR(11),
    "ordinal" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "shortTitle" VARCHAR(60) NOT NULL,
    "verbatimText" TEXT NOT NULL,
    "pageNumber" INTEGER,
    "charStart" INTEGER,
    "charEnd" INTEGER,
    "state" "ClauseState" NOT NULL DEFAULT 'Processing',
    "extractionMethod" "ExtractionMethod" NOT NULL DEFAULT 'structural',
    "extractionConfidence" DOUBLE PRECISION,
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,
    "decisionBasis" TEXT,
    "origin" "Origin" NOT NULL DEFAULT 'ingested',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceClause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClauseFlag" (
    "id" TEXT NOT NULL,
    "clauseId" VARCHAR(11) NOT NULL,
    "kind" "ClauseFlagKind" NOT NULL,
    "detail" TEXT,
    "raisedBy" "FlagRaisedBy" NOT NULL DEFAULT 'system',
    "raisedById" TEXT,
    "raisedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolutionNote" TEXT,

    CONSTRAINT "ClauseFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClauseLink" (
    "id" TEXT NOT NULL,
    "fromId" VARCHAR(11) NOT NULL,
    "toId" VARCHAR(11) NOT NULL,
    "kind" "ClauseLinkKind" NOT NULL,
    "note" TEXT,

    CONSTRAINT "ClauseLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PenaltyTier" (
    "id" TEXT NOT NULL,
    "clauseId" VARCHAR(11) NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "amountMinor" BIGINT,
    "currency" VARCHAR(3),
    "perDay" BOOLEAN NOT NULL DEFAULT false,
    "nonMonetary" TEXT,

    CONSTRAINT "PenaltyTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Control" (
    "id" VARCHAR(11) NOT NULL,
    "title" TEXT NOT NULL,
    "shortTitle" VARCHAR(60) NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "type" "ControlType" NOT NULL DEFAULT 'Preventive',
    "automation" "ControlAutomation" NOT NULL DEFAULT 'Manual',
    "origin" "Origin" NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Control_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlClause" (
    "controlId" VARCHAR(11) NOT NULL,
    "clauseId" VARCHAR(11) NOT NULL,

    CONSTRAINT "ControlClause_pkey" PRIMARY KEY ("controlId","clauseId")
);

-- CreateTable
CREATE TABLE "ControlFrameworkRef" (
    "id" TEXT NOT NULL,
    "controlId" VARCHAR(11) NOT NULL,
    "framework" VARCHAR(32) NOT NULL,
    "ref" VARCHAR(48) NOT NULL,

    CONSTRAINT "ControlFrameworkRef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Obligation" (
    "id" VARCHAR(11) NOT NULL,
    "title" TEXT NOT NULL,
    "shortTitle" VARCHAR(60) NOT NULL,
    "regulator" VARCHAR(32) NOT NULL,
    "frequency" "Frequency" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "checkerId" TEXT,
    "evidenceRequirement" TEXT,
    "sourceClauseId" VARCHAR(11),
    "origin" "Origin" NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Obligation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObligationControl" (
    "obligationId" VARCHAR(11) NOT NULL,
    "controlId" VARCHAR(11) NOT NULL,

    CONSTRAINT "ObligationControl_pkey" PRIMARY KEY ("obligationId","controlId")
);

-- CreateTable
CREATE TABLE "ObligationCycle" (
    "id" VARCHAR(24) NOT NULL,
    "obligationId" VARCHAR(11) NOT NULL,
    "period" VARCHAR(8) NOT NULL,
    "dueDate" DATE NOT NULL,
    "state" "CycleState" NOT NULL DEFAULT 'Due',
    "filedAt" TIMESTAMP(3),
    "origin" "Origin" NOT NULL DEFAULT 'user',

    CONSTRAINT "ObligationCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" VARCHAR(11) NOT NULL,
    "title" TEXT NOT NULL,
    "shortTitle" VARCHAR(60) NOT NULL,
    "completionPolicy" "CompletionPolicy" NOT NULL,
    "state" "TaskState" NOT NULL DEFAULT 'Open',
    "assigneeId" TEXT NOT NULL,
    "checkerId" TEXT,
    "dueDate" DATE,
    "cycleId" VARCHAR(24),
    "submittedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "origin" "Origin" NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" VARCHAR(11) NOT NULL,
    "title" TEXT NOT NULL,
    "shortTitle" VARCHAR(60) NOT NULL,
    "kind" "EvidenceKind" NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "capturedById" TEXT,
    "capturedBySystem" TEXT,
    "documentSha256" TEXT,
    "state" "EvidenceState" NOT NULL DEFAULT 'Submitted',
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "origin" "Origin" NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskEvidence" (
    "taskId" VARCHAR(11) NOT NULL,
    "evidenceId" VARCHAR(11) NOT NULL,

    CONSTRAINT "TaskEvidence_pkey" PRIMARY KEY ("taskId","evidenceId")
);

-- CreateTable
CREATE TABLE "ControlEvidence" (
    "controlId" VARCHAR(11) NOT NULL,
    "evidenceId" VARCHAR(11) NOT NULL,

    CONSTRAINT "ControlEvidence_pkey" PRIMARY KEY ("controlId","evidenceId")
);

-- CreateTable
CREATE TABLE "Risk" (
    "id" VARCHAR(11) NOT NULL,
    "title" TEXT NOT NULL,
    "shortTitle" VARCHAR(60) NOT NULL,
    "domain" "RiskDomain" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "likelihood" INTEGER NOT NULL,
    "impact" INTEGER NOT NULL,
    "origin" "Origin" NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Risk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskControl" (
    "riskId" VARCHAR(11) NOT NULL,
    "controlId" VARCHAR(11) NOT NULL,

    CONSTRAINT "RiskControl_pkey" PRIMARY KEY ("riskId","controlId")
);

-- CreateTable
CREATE TABLE "IdSequence" (
    "scope" VARCHAR(16) NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "IdSequence_pkey" PRIMARY KEY ("scope")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEntry" (
    "id" VARCHAR(11) NOT NULL,
    "seq" BIGINT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT,
    "actorLabel" TEXT,
    "action" VARCHAR(48) NOT NULL,
    "entityType" VARCHAR(32) NOT NULL,
    "entityId" VARCHAR(24),
    "detail" JSONB,
    "prevHash" VARCHAR(64),
    "hash" VARCHAR(64) NOT NULL,

    CONSTRAINT "AuditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Person_email_key" ON "Person"("email");

-- CreateIndex
CREATE INDEX "Person_organizationId_department_idx" ON "Person"("organizationId", "department");

-- CreateIndex
CREATE INDEX "Person_origin_idx" ON "Person"("origin");

-- CreateIndex
CREATE INDEX "ActionAuthority_action_idx" ON "ActionAuthority"("action");

-- CreateIndex
CREATE INDEX "Instrument_status_idx" ON "Instrument"("status");

-- CreateIndex
CREATE INDEX "Instrument_origin_idx" ON "Instrument"("origin");

-- CreateIndex
CREATE INDEX "InstrumentRelation_toId_idx" ON "InstrumentRelation"("toId");

-- CreateIndex
CREATE UNIQUE INDEX "InstrumentRelation_fromId_toId_kind_key" ON "InstrumentRelation"("fromId", "toId", "kind");

-- CreateIndex
CREATE INDEX "SourceClause_state_idx" ON "SourceClause"("state");

-- CreateIndex
CREATE INDEX "SourceClause_instrumentId_ordinal_idx" ON "SourceClause"("instrumentId", "ordinal");

-- CreateIndex
CREATE UNIQUE INDEX "SourceClause_instrumentId_clauseRef_key" ON "SourceClause"("instrumentId", "clauseRef");

-- CreateIndex
CREATE INDEX "ClauseFlag_clauseId_idx" ON "ClauseFlag"("clauseId");

-- CreateIndex
CREATE INDEX "ClauseFlag_kind_resolvedAt_idx" ON "ClauseFlag"("kind", "resolvedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClauseLink_fromId_toId_kind_key" ON "ClauseLink"("fromId", "toId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "PenaltyTier_clauseId_ordinal_key" ON "PenaltyTier"("clauseId", "ordinal");

-- CreateIndex
CREATE INDEX "Control_ownerId_idx" ON "Control"("ownerId");

-- CreateIndex
CREATE INDEX "Control_origin_idx" ON "Control"("origin");

-- CreateIndex
CREATE INDEX "ControlClause_clauseId_idx" ON "ControlClause"("clauseId");

-- CreateIndex
CREATE UNIQUE INDEX "ControlFrameworkRef_controlId_framework_ref_key" ON "ControlFrameworkRef"("controlId", "framework", "ref");

-- CreateIndex
CREATE INDEX "Obligation_ownerId_idx" ON "Obligation"("ownerId");

-- CreateIndex
CREATE INDEX "Obligation_origin_idx" ON "Obligation"("origin");

-- CreateIndex
CREATE INDEX "ObligationControl_controlId_idx" ON "ObligationControl"("controlId");

-- CreateIndex
CREATE INDEX "ObligationCycle_dueDate_state_idx" ON "ObligationCycle"("dueDate", "state");

-- CreateIndex
CREATE UNIQUE INDEX "ObligationCycle_obligationId_period_key" ON "ObligationCycle"("obligationId", "period");

-- CreateIndex
CREATE INDEX "Task_assigneeId_state_idx" ON "Task"("assigneeId", "state");

-- CreateIndex
CREATE INDEX "Task_dueDate_state_idx" ON "Task"("dueDate", "state");

-- CreateIndex
CREATE INDEX "Evidence_state_idx" ON "Evidence"("state");

-- CreateIndex
CREATE INDEX "Evidence_origin_idx" ON "Evidence"("origin");

-- CreateIndex
CREATE INDEX "TaskEvidence_evidenceId_idx" ON "TaskEvidence"("evidenceId");

-- CreateIndex
CREATE INDEX "ControlEvidence_evidenceId_idx" ON "ControlEvidence"("evidenceId");

-- CreateIndex
CREATE INDEX "Risk_ownerId_idx" ON "Risk"("ownerId");

-- CreateIndex
CREATE INDEX "RiskControl_controlId_idx" ON "RiskControl"("controlId");

-- CreateIndex
CREATE INDEX "Session_personId_idx" ON "Session"("personId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuditEntry_seq_key" ON "AuditEntry"("seq");

-- CreateIndex
CREATE INDEX "AuditEntry_entityType_entityId_idx" ON "AuditEntry"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditEntry_at_idx" ON "AuditEntry"("at");

-- CreateIndex
CREATE INDEX "AuditEntry_actorId_idx" ON "AuditEntry"("actorId");

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonRole" ADD CONSTRAINT "PersonRole_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonRole" ADD CONSTRAINT "PersonRole_roleCode_fkey" FOREIGN KEY ("roleCode") REFERENCES "Role"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionAuthority" ADD CONSTRAINT "ActionAuthority_roleCode_fkey" FOREIGN KEY ("roleCode") REFERENCES "Role"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Instrument" ADD CONSTRAINT "Instrument_documentSha256_fkey" FOREIGN KEY ("documentSha256") REFERENCES "Document"("sha256") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstrumentRelation" ADD CONSTRAINT "InstrumentRelation_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "Instrument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstrumentRelation" ADD CONSTRAINT "InstrumentRelation_toId_fkey" FOREIGN KEY ("toId") REFERENCES "Instrument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceClause" ADD CONSTRAINT "SourceClause_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "Instrument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceClause" ADD CONSTRAINT "SourceClause_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "SourceClause"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceClause" ADD CONSTRAINT "SourceClause_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClauseFlag" ADD CONSTRAINT "ClauseFlag_clauseId_fkey" FOREIGN KEY ("clauseId") REFERENCES "SourceClause"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClauseFlag" ADD CONSTRAINT "ClauseFlag_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClauseFlag" ADD CONSTRAINT "ClauseFlag_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClauseLink" ADD CONSTRAINT "ClauseLink_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "SourceClause"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClauseLink" ADD CONSTRAINT "ClauseLink_toId_fkey" FOREIGN KEY ("toId") REFERENCES "SourceClause"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenaltyTier" ADD CONSTRAINT "PenaltyTier_clauseId_fkey" FOREIGN KEY ("clauseId") REFERENCES "SourceClause"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Control" ADD CONSTRAINT "Control_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlClause" ADD CONSTRAINT "ControlClause_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlClause" ADD CONSTRAINT "ControlClause_clauseId_fkey" FOREIGN KEY ("clauseId") REFERENCES "SourceClause"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlFrameworkRef" ADD CONSTRAINT "ControlFrameworkRef_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Obligation" ADD CONSTRAINT "Obligation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Obligation" ADD CONSTRAINT "Obligation_checkerId_fkey" FOREIGN KEY ("checkerId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Obligation" ADD CONSTRAINT "Obligation_sourceClauseId_fkey" FOREIGN KEY ("sourceClauseId") REFERENCES "SourceClause"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObligationControl" ADD CONSTRAINT "ObligationControl_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "Obligation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObligationControl" ADD CONSTRAINT "ObligationControl_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObligationCycle" ADD CONSTRAINT "ObligationCycle_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "Obligation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_checkerId_fkey" FOREIGN KEY ("checkerId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "ObligationCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_capturedById_fkey" FOREIGN KEY ("capturedById") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_documentSha256_fkey" FOREIGN KEY ("documentSha256") REFERENCES "Document"("sha256") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskEvidence" ADD CONSTRAINT "TaskEvidence_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskEvidence" ADD CONSTRAINT "TaskEvidence_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlEvidence" ADD CONSTRAINT "ControlEvidence_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlEvidence" ADD CONSTRAINT "ControlEvidence_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "Evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskControl" ADD CONSTRAINT "RiskControl_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "Risk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskControl" ADD CONSTRAINT "RiskControl_controlId_fkey" FOREIGN KEY ("controlId") REFERENCES "Control"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEntry" ADD CONSTRAINT "AuditEntry_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
