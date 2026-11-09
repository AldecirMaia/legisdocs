import { Controller, Post, Body, Get, Param, Patch } from '@nestjs/common';
import { DocumentService } from './document.service';
import { DocumentType, DocumentStatus } from '@prisma/client';

@Controller('document')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('create')
  create(@Body() body: any) {
    return this.documentService.create(body);
  }

  // NOVA ROTA: Cria e grava documentos manuais injetados pela pauta
  @Post('create-manual')
  createManual(@Body() body: any) {
    return this.documentService.createManual(body);
  }

  @Get('gabinete/:gabineteId')
  findByGabinete(@Param('gabineteId') gabineteId: string) {
    return this.documentService.findByGabinete(gabineteId);
  }

  @Get('fila/:tenantId')
  findFilaAnalise(@Param('tenantId') tenantId: string) {
    return this.documentService.findFilaAnalise(tenantId);
  }

  @Get('aprovados/:tenantId')
  findAprovados(@Param('tenantId') tenantId: string) {
    return this.documentService.findAprovados(tenantId);
  }

  @Get('detalhe/:id')
  findOne(@Param('id') id: string) {
    return this.documentService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string, 
    @Body() body: { status: DocumentStatus; feedback?: string; feedbackSecretaria?: string }
  ) {
    const motivo = body.feedbackSecretaria || body.feedback;
    return this.documentService.updateStatus(id, body.status, motivo);
  }

  @Patch('edit/:id')
  updateDocument(@Param('id') id: string, @Body() body: any) {
    return this.documentService.updateDocument(id, body);
  }
  
  @Get('aprovados-secretaria/:tenantId')
  async getAprovadosSecretaria(@Param('tenantId') tenantId: string) {
    return this.documentService.findAprovadosSecretaria(tenantId);
  }
}