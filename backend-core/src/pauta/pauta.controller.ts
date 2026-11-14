import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { PautaService } from './pauta.service';
import { PrismaService } from '../prisma/prisma.service'; // Ajuste o caminho se necessário

@Controller('pauta')
export class PautaController {
  constructor(
    private readonly pautaService: PautaService,
    private readonly prisma: PrismaService // Injetamos o Prisma corretamente aqui
  ) {}

  @Post('enviar')
  async enviarPauta(@Body() data: any) {
    // Mantém a chamada para o service que faz a transação segura 
    // (salva a SessaoPauta E avança a fase dos documentos na esteira)
    return this.pautaService.enviarPauta(data);
  }

  @Get('ativa/:tenantId')
  async obterPautaAtiva(@Param('tenantId') tenantId: string) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    return this.prisma.sessaoPauta.findFirst({
      where: { 
        tenantId, 
        criadoEm: { gte: hoje } 
      },
      orderBy: { criadoEm: 'desc' },
    });
  }
  @Post('enviar-ata')
  async enviarPautaDiretoAta(@Body() data: any) {
    return this.pautaService.enviarPautaDiretoAta(data);
  }
  @Get('historico/:tenantId')
  async obterHistoricoPautas(@Param('tenantId') tenantId: string) {
    return this.prisma.sessaoPauta.findMany({
      where: { tenantId },
      orderBy: { criadoEm: 'desc' },
      take: 10
    });
  }
}