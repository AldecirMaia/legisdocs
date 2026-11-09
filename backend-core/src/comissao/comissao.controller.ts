import { Controller, Get, Post, Put, Body, Param, Delete } from '@nestjs/common';
import { ComissaoService } from './comissao.service';

@Controller('comissoes')
export class ComissaoController {
  constructor(private readonly comissaoService: ComissaoService) {}

  @Post()
  criar(@Body() data: any) {
    return this.comissaoService.criarComissao(data);
  }

  @Get('list/:tenantId')
  listar(@Param('tenantId') tenantId: string) {
    return this.comissaoService.listarComissoes(tenantId);
  }

  @Get('kanban/:tenantId')
  listarKanban(@Param('tenantId') tenantId: string) {
    return this.comissaoService.listarKanban(tenantId);
  }

  @Post('tramitacao')
  despachar(@Body() data: any) {
    return this.comissaoService.despachar(data);
  }

  @Put('tramitacao/:id')
  atualizarTramitacao(@Param('id') id: string, @Body() data: any) {
    return this.comissaoService.atualizarTramitacao(id, data);
  }
  @Put(':id')
  atualizar(@Param('id') id: string, @Body() data: any) {
    return this.comissaoService.atualizarComissao(id, data);
  }

  @Delete(':id')
  excluir(@Param('id') id: string) {
    return this.comissaoService.excluirComissao(id);
  }
  @Put('tramitacao/:id/relator')
  designarRelator(@Param('id') id: string, @Body() data: { relatorId: string }) {
    return this.comissaoService.designarRelator(id, data.relatorId);
  }

  @Put('tramitacao/:id/parecer')
  emitirParecer(@Param('id') id: string, @Body() data: any) {
    return this.comissaoService.emitirParecer(id, data);
  }

  @Post('tramitacao/:id/assinar')
  assinarParecer(@Param('id') id: string, @Body() data: any) {
    // data deve conter: { vereadorId, tipoVoto, justificativa }
    return this.comissaoService.assinarParecer(id, data.vereadorId, data);
  }
}