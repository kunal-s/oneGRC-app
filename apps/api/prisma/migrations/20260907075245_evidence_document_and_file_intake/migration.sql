-- DropForeignKey
ALTER TABLE "Evidence" DROP CONSTRAINT "Evidence_documentSha256_fkey";

-- DropForeignKey
ALTER TABLE "Instrument" DROP CONSTRAINT "Instrument_documentSha256_fkey";

-- AlterTable
ALTER TABLE "Evidence" ADD COLUMN     "capturedOnBehalfOfId" TEXT;

-- CreateTable
CREATE TABLE "AcceptedFileType" (
    "mimeType" VARCHAR(96) NOT NULL,
    "label" VARCHAR(24) NOT NULL,
    "origin" "Origin" NOT NULL DEFAULT 'reference',

    CONSTRAINT "AcceptedFileType_pkey" PRIMARY KEY ("mimeType")
);

-- CreateTable
CREATE TABLE "FileIntakeLimit" (
    "key" VARCHAR(32) NOT NULL,
    "maxBytes" INTEGER NOT NULL,
    "origin" "Origin" NOT NULL DEFAULT 'reference',

    CONSTRAINT "FileIntakeLimit_pkey" PRIMARY KEY ("key")
);

-- AddForeignKey
ALTER TABLE "Instrument" ADD CONSTRAINT "Instrument_documentSha256_fkey" FOREIGN KEY ("documentSha256") REFERENCES "Document"("sha256") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_capturedOnBehalfOfId_fkey" FOREIGN KEY ("capturedOnBehalfOfId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_documentSha256_fkey" FOREIGN KEY ("documentSha256") REFERENCES "Document"("sha256") ON DELETE RESTRICT ON UPDATE CASCADE;
