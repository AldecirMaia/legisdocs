-- CreateEnum
CREATE TYPE "TipoVotoParecer" AS ENUM ('ACOMPANHA_RELATOR', 'DIVERGE_RELATOR', 'ABSTENCAO');

-- CreateTable
CREATE TABLE "AssinaturaParecer" (
    "id" TEXT NOT NULL,
    "tipoVoto" "TipoVotoParecer" NOT NULL DEFAULT 'ACOMPANHA_RELATOR',
    "justificativa" TEXT,
    "tramitacaoId" TEXT NOT NULL,
    "vereadorId" TEXT NOT NULL,
    "assinadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssinaturaParecer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssinaturaParecer_tramitacaoId_vereadorId_key" ON "AssinaturaParecer"("tramitacaoId", "vereadorId");

-- AddForeignKey
ALTER TABLE "AssinaturaParecer" ADD CONSTRAINT "AssinaturaParecer_tramitacaoId_fkey" FOREIGN KEY ("tramitacaoId") REFERENCES "TramitacaoComissao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssinaturaParecer" ADD CONSTRAINT "AssinaturaParecer_vereadorId_fkey" FOREIGN KEY ("vereadorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
