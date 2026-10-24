-- CreateTable
CREATE TABLE "SecretariaDestino" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "titular" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecretariaDestino_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SecretariaDestino_tenantId_idx" ON "SecretariaDestino"("tenantId");

-- AddForeignKey
ALTER TABLE "SecretariaDestino" ADD CONSTRAINT "SecretariaDestino_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
