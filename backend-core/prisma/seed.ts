import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const masterTenant = await prisma.tenant.upsert({
    where: { slug: 'legisdocs-master' },
    update: { isActive: true }, 
    create: {
      name: 'LegisDocs SaaS',
      slug: 'legisdocs-master',
      isActive: true,
    },
  });

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@legisdocs.com.br' },
    update: {
      password: 'superadmin123', // Senha em texto plano compatível com o AuthService atual
      role: 'SUPER_ADMIN',
      tenantId: masterTenant.id
    },
    create: {
      name: 'Super Administrador',
      email: 'admin@legisdocs.com.br',
      password: 'superadmin123',
      role: 'SUPER_ADMIN',
      tenantId: masterTenant.id,
    },
  });

  console.log('✅ Super Admin configurado com sucesso!');
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