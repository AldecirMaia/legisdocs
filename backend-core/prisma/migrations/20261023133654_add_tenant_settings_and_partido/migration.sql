-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "artigoIndicacao" TEXT,
ADD COLUMN     "cidadeEstado" TEXT,
ADD COLUMN     "palacioNome" TEXT,
ADD COLUMN     "prefeitoNome" TEXT,
ADD COLUMN     "salaSessoesNome" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "partido" TEXT;
