-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('inApp', 'email', 'digest');

-- CreateEnum
CREATE TYPE "PreferenceChannel" AS ENUM ('inApp', 'email');

-- CreateEnum
CREATE TYPE "DigestCadence" AS ENUM ('immediate', 'daily', 'weekly');

-- CreateEnum
CREATE TYPE "NotificationSeverity" AS ENUM ('info', 'warn', 'critical');

-- CreateTable
CREATE TABLE "DepartmentHead" (
    "id" TEXT NOT NULL,
    "department" "Department" NOT NULL,
    "personId" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "origin" "Origin" NOT NULL DEFAULT 'earned',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DepartmentHead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "personId" TEXT NOT NULL,
    "eventType" VARCHAR(32) NOT NULL,
    "channels" "PreferenceChannel"[],
    "digest" "DigestCadence" NOT NULL DEFAULT 'immediate',
    "origin" "Origin" NOT NULL DEFAULT 'earned',

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("personId","eventType")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventType" VARCHAR(32) NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "severity" "NotificationSeverity" NOT NULL,
    "entityType" VARCHAR(32),
    "entityId" VARCHAR(48),
    "channel" "NotificationChannel" NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "rungOffsetDays" INTEGER,
    "dueAt" TIMESTAMP(3),
    "deliveryAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "origin" "Origin" NOT NULL DEFAULT 'earned',

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DepartmentHead_department_effectiveFrom_idx" ON "DepartmentHead"("department", "effectiveFrom");

-- CreateIndex
CREATE INDEX "Notification_recipientId_at_idx" ON "Notification"("recipientId", "at");

-- CreateIndex
CREATE INDEX "Notification_entityType_entityId_idx" ON "Notification"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_recipientId_eventType_entityType_entityId_rung_key" ON "Notification"("recipientId", "eventType", "entityType", "entityId", "rungOffsetDays", "channel");

-- AddForeignKey
ALTER TABLE "DepartmentHead" ADD CONSTRAINT "DepartmentHead_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;
