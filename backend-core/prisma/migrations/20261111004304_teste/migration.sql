-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "texto" TEXT;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "moduloComissoes" BOOLEAN NOT NULL DEFAULT true;
