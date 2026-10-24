import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class GabineteService {

  // Cria um novo gabinete vinculado à Câmara (Tenant)
  async create(name: string, tenantId: string) {
    return await prisma.gabinete.create({
      data: {
        name,
        tenantId,
      },
    });
  }

  // Lista todos os gabinetes de uma Câmara específica, incluindo os seus membros
  async findAllByTenant(tenantId: string) {
    return await prisma.gabinete.findMany({
      where: { tenantId },
      include: {
        users: {
          select: { id: true, name: true, role: true, email: true }
        }
      },
      orderBy: { name: 'asc' }
    });
  }
  async toggleStatus(id: string, isActive: boolean) {
    return await prisma.gabinete.update({
      where: { id },
      data: { isActive },
    });
  }
}