import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const router = Router();
const prisma = new PrismaClient();

// Listar todas as Câmaras (Tenants)
router.get('/tenants', async (req: Request, res: Response) => {
  try {
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(tenants);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar câmaras.' });
  }
});

// Criar nova Câmara (Tenant) e o perfil do Administrador
router.post('/tenants', async (req: Request, res: Response) => {
  const { name, slug, cnpj, adminName, adminEmail, adminPassword } = req.body;

  if (!name || !slug || !adminEmail || !adminPassword) {
    return res.status(400).json({ error: 'Dados incompletos.' });
  }

  try {
    // Verificar se o slug ou email já existem
    const existingTenant = await prisma.tenant.findUnique({ where: { slug } });
    if (existingTenant) {
      return res.status(400).json({ error: 'Já existe uma câmara com este identificador (slug).' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existingUser) {
      return res.status(400).json({ error: 'Este e-mail já está em uso por outro utilizador.' });
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Criar o Tenant e o User numa única transação
    const result = await prisma.$transaction(async (prisma) => {
      const newTenant = await prisma.tenant.create({
        data: {
          name,
          slug,
          cnpj,
          status: 'ATIVO',
        }
      });

      const newAdmin = await prisma.user.create({
        data: {
          name: adminName,
          email: adminEmail,
          password: hashedPassword,
          role: 'SECRETARIA', // O administrador da Câmara tem o cargo de Secretaria
          tenantId: newTenant.id,
        }
      });

      return { tenant: newTenant, admin: newAdmin };
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("Erro ao criar tenant:", error);
    res.status(500).json({ error: 'Erro interno ao criar a nova Câmara.' });
  }
});

export default router;