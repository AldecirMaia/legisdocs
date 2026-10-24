import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class SecretariaDestinoService {
  
  // Cria uma nova secretaria de destino (Apenas para uso da Secretaria Master)
  async create(data: { nome: string; titular?: string; tenantId: string }) {
    return await prisma.secretariaDestino.create({
      data: {
        nome: data.nome,
        titular: data.titular,
        tenantId: data.tenantId,
      },
    });
  }

  // Lista todas as secretarias ativas de uma Câmara (Para os Gabinetes usarem no formulário)
  async findAllActiveByTenant(tenantId: string) {
    return await prisma.secretariaDestino.findMany({
      where: { 
        tenantId,
        isActive: true // Traz apenas as ativas para não poluir o dropdown do gabinete
      },
      orderBy: { nome: 'asc' }
    });
  }

  // Permite inativar uma secretaria se o prefeito mudar a estrutura (Soft Delete)
  async toggleStatus(id: string, isActive: boolean) {
    return await prisma.secretariaDestino.update({
      where: { id },
      data: { isActive },
    });
  }
}