import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. Cria ou atualiza o Tenant Master
  const masterTenant = await prisma.tenant.upsert({
    where: { slug: 'legisdocs-master' },
    update: { isActive: true }, 
    create: {
      name: 'LegisDocs SaaS',
      slug: 'legisdocs-master',
      isActive: true,
    },
  });

  // 2. NOVO: Cria ou atualiza um Gabinete Administrativo Padrão
  // Necessário para vincular usuários e testar a criação de documentos
  const gabineteMaster = await prisma.gabinete.upsert({
    where: { 
      // Se você não tiver um campo unique no Gabinete (como slug), podemos buscar pelo nome e tenantId
      // Como o upsert exige um campo unique, se não tiver, usamos findFirst + create
      id: 'gabinete-master-id' // Apenas um placeholder, veja a implementação segura abaixo usando o Prisma padrão
    },
    update: { isActive: true },
    create: {
      id: 'gabinete-master-id', // Forçando um ID conhecido para facilitar o upsert
      name: 'Gabinete Administrativo',
      isActive: true,
      tenantId: masterTenant.id,
    }
  });

  // 3. Cria ou atualiza o Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@legisdocs.com.br' },
    update: {
      password: 'superadmin123', // Senha em texto plano compatível com o AuthService atual
      role: 'SUPER_ADMIN',
      tenantId: masterTenant.id,
      gabineteId: gabineteMaster.id // NOVO: Vincula o admin ao gabinete criado
    },
    create: {
      name: 'Super Administrador',
      email: 'admin@legisdocs.com.br',
      password: 'superadmin123',
      role: 'SUPER_ADMIN',
      tenantId: masterTenant.id,
      gabineteId: gabineteMaster.id, // NOVO: Vincula o admin ao gabinete criado
    },
  });

  console.log('✅ Super Admin e Gabinete configurados com sucesso!');
  console.log(`📧 E-mail: ${superAdmin.email}`);
  console.log('🔑 Senha: superadmin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });