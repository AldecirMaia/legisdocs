import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Controller('pauta')
export class PautaController {
  @Post('enviar')
  async enviarPauta(@Body() data: any) {
    return prisma.sessaoPauta.create({
      data: {
        tenantId: data.tenantId,
        nomeSessao: data.nomeSessao,
        dataSessao: data.dataSessao,
        itens: data.itens,
      }
    });
  }

  @Get('ativa/:tenantId')
  async obterPautaAtiva(@Param('tenantId') tenantId: string) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    return prisma.sessaoPauta.findFirst({
      where: { 
        tenantId, 
        criadoEm: { gte: hoje } 
      },
      orderBy: { criadoEm: 'desc' },
    });
    }
  @Get('historico/:tenantId')
  async obterHistoricoPautas(@Param('tenantId') tenantId: string) {
    return prisma.sessaoPauta.findMany({
      where: { tenantId },
      orderBy: { criadoEm: 'desc' },
      take: 10
    });
  }
}