import { Controller, Post, Body, Get, Param, Patch } from '@nestjs/common';
import { SecretariaDestinoService } from './secretaria-destino.service';

@Controller('secretaria-destino')
export class SecretariaDestinoController {
  constructor(private readonly secretariaDestinoService: SecretariaDestinoService) {}

  @Post('create')
  create(@Body() body: { nome: string; titular?: string; tenantId: string }) {
    return this.secretariaDestinoService.create(body);
  }

  @Get('list/active/:tenantId')
  findAllActive(@Param('tenantId') tenantId: string) {
    return this.secretariaDestinoService.findAllActiveByTenant(tenantId);
  }

  @Patch(':id/status')
  toggleStatus(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.secretariaDestinoService.toggleStatus(id, isActive);
  }
}