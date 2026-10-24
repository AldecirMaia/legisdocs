/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,type,protocolNum,year]` on the table `Document` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentType" ADD VALUE 'PARECER';
ALTER TYPE "DocumentType" ADD VALUE 'EMENDA_ADITIVA';
ALTER TYPE "DocumentType" ADD VALUE 'EMENDA_IMPOSITIVA';

-- DropIndex
DROP INDEX "Document_tenantId_protocolNum_year_key";

-- CreateIndex
CREATE UNIQUE INDEX "Document_tenantId_type_protocolNum_year_key" ON "Document"("tenantId", "type", "protocolNum", "year");
