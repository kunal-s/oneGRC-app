-- AlterTable
ALTER TABLE "ProvisionFlag" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "SourceClause" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "SourceProvision" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;
