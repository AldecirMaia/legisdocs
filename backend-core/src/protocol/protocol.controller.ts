import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ProtocolService } from './protocol.service';
import { DocumentType } from '@prisma/client';

@Controller('protocol')
export class ProtocolController {
  constructor(private readonly protocolService: ProtocolService) {}

  @Post('create')
  async createProtocol(
    @Body() body: {
      tenantId: string;
      authorId: string;
      type: DocumentType;
      ementa: string;
      content: string;
    }
  ) {
    return this.protocolService.createDocument(body);
  }

  @Get('list/:tenantId')
  async listProtocols(@Param('tenantId') tenantId: string) {
    return this.protocolService.getDocumentsByTenant(tenantId);
  }
}