/*
  Warnings:

  - The values [PROJETO_LEI] on the enum `DocumentType` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "StatusTramitacao" AS ENUM ('AGUARDANDO_DESPACHO', 'EM_ANALISE', 'AGUARDANDO_VOTACAO', 'CONCLUIDO', 'DEVOLVIDO');

-- CreateEnum
CREATE TYPE "CargoComissao" AS ENUM ('PRESIDENTE', 'VICE_PRESIDENTE', 'RELATOR', 'MEMBRO', 'SUPLENTE');

-- AlterEnum
ALTER TYPE "DocumentStatus" ADD VALUE 'AGUARDANDO_ASSINATURA';

-- AlterEnum
BEGIN;
CREATE TYPE "DocumentType_new" AS ENUM ('INDICACAO', 'REQUERIMENTO', 'PROJETO_LEI_LEGISLATIVO', 'PROJETO_LEI_EXECUTIVO', 'OFICIO', 'MOCAO', 'PARECER', 'EMENDA_ADITIVA', 'EMENDA_IMPOSITIVA');
ALTER TABLE "Document" ALTER COLUMN "type" TYPE "DocumentType_new" USING ("type"::text::"DocumentType_new");
ALTER TYPE "DocumentType" RENAME TO "DocumentType_old";
ALTER TYPE "DocumentType_new" RENAME TO "DocumentType";
DROP TYPE "DocumentType_old";
COMMIT;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "contatoRodape" TEXT,
ADD COLUMN     "enderecoRodape" TEXT,
ADD COLUMN     "moduloAtas" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "moduloPlenario" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "RegistroVotacao" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "sim" INTEGER NOT NULL,
    "nao" INTEGER NOT NULL,
    "abstencao" INTEGER NOT NULL,
    "ausentes" INTEGER NOT NULL,
    "votos" JSONB NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroVotacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessaoPauta" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nomeSessao" TEXT NOT NULL,
    "dataSessao" TEXT NOT NULL,
    "itens" JSONB NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessaoPauta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessaoPresenca" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessaoPautaId" TEXT NOT NULL,
    "vereadorId" TEXT NOT NULL,
    "vereadorNome" TEXT NOT NULL,
    "presente" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessaoPresenca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comissao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "sigla" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comissao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComissaoMembro" (
    "id" TEXT NOT NULL,
    "cargo" "CargoComissao" NOT NULL DEFAULT 'MEMBRO',
    "comissaoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ComissaoMembro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TramitacaoComissao" (
    "id" TEXT NOT NULL,
    "status" "StatusTramitacao" NOT NULL DEFAULT 'AGUARDANDO_DESPACHO',
    "prazoVencimento" TIMESTAMP(3),
    "resultado" TEXT,
    "parecerFinal" TEXT,
    "documentId" TEXT NOT NULL,
    "comissaoId" TEXT NOT NULL,
    "relatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "TramitacaoComissao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessaoPauta_tenantId_criadoEm_idx" ON "SessaoPauta"("tenantId", "criadoEm");

-- CreateIndex
CREATE UNIQUE INDEX "SessaoPresenca_sessaoPautaId_vereadorId_key" ON "SessaoPresenca"("sessaoPautaId", "vereadorId");

-- CreateIndex
CREATE INDEX "Comissao_tenantId_idx" ON "Comissao"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ComissaoMembro_comissaoId_userId_key" ON "ComissaoMembro"("comissaoId", "userId");

-- CreateIndex
CREATE INDEX "TramitacaoComissao_documentId_idx" ON "TramitacaoComissao"("documentId");

-- CreateIndex
CREATE INDEX "TramitacaoComissao_comissaoId_idx" ON "TramitacaoComissao"("comissaoId");

-- AddForeignKey
ALTER TABLE "SessaoPresenca" ADD CONSTRAINT "SessaoPresenca_sessaoPautaId_fkey" FOREIGN KEY ("sessaoPautaId") REFERENCES "SessaoPauta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comissao" ADD CONSTRAINT "Comissao_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComissaoMembro" ADD CONSTRAINT "ComissaoMembro_comissaoId_fkey" FOREIGN KEY ("comissaoId") REFERENCES "Comissao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComissaoMembro" ADD CONSTRAINT "ComissaoMembro_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TramitacaoComissao" ADD CONSTRAINT "TramitacaoComissao_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TramitacaoComissao" ADD CONSTRAINT "TramitacaoComissao_comissaoId_fkey" FOREIGN KEY ("comissaoId") REFERENCES "Comissao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TramitacaoComissao" ADD CONSTRAINT "TramitacaoComissao_relatorId_fkey" FOREIGN KEY ("relatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TramitacaoComissao" ADD CONSTRAINT "TramitacaoComissao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
