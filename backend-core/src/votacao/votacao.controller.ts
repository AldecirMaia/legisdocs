import { Controller, Post, Body } from '@nestjs/common';
import { PrismaClient, DocumentStatus } from '@prisma/client';

const prisma = new PrismaClient();

@Controller('votacao')
export class VotacaoController {
  @Post('salvar')
  async salvarResultado(@Body() data: any) {
    const registro = await prisma.registroVotacao.create({
      data: {
        tenantId: data.tenantId,
        documentId: data.documentId,
        sim: data.sim,
        nao: data.nao,
        abstencao: data.abstencao,
        ausentes: data.ausentes,
        votos: data.votos,
      },
    });
    
    // Atualiza o status do Documento com base na maioria simples
    await prisma.document.update({
      where: { id: data.documentId },
      data: { 
        status: data.sim > data.nao 
          ? DocumentStatus.APROVADO 
          : DocumentStatus.CANCELADO 
      }
    });
    return registro;
  }
}