import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class TenantService {
  async getSettings(id: string) {
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Câmara não encontrada.');
    return tenant;
  }

  async updateSettings(id: string, data: any) {
    return await prisma.tenant.update({
      where: { id },
      data: {
        prefeitoNome: data.prefeitoNome,
        palacioNome: data.palacioNome,
        salaSessoesNome: data.salaSessoesNome,
        cidadeEstado: data.cidadeEstado,
        artigoIndicacao: data.artigoIndicacao,
        logoCabecalho: data.logoCabecalho,
        marcaDagua: data.marcaDagua,
        enderecoRodape: data.enderecoRodape,
        contatoRodape: data.contatoRodape,
      },
    });
  }
}