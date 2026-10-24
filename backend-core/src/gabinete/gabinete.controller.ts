import { Controller, Post, Body, Get, Param, Patch } from '@nestjs/common';
import { GabineteService } from './gabinete.service';

@Controller('gabinete')
export class GabineteController {
  constructor(private readonly gabineteService: GabineteService) {}
  @Patch(':id/status')
  toggleStatus(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.gabineteService.toggleStatus(id, isActive);
  }
  @Post('create')
  create(@Body() body: { name: string; tenantId: string }) {
    return this.gabineteService.create(body.name, body.tenantId);
  }

  @Get('list/:tenantId')
  findAll(@Param('tenantId') tenantId: string) {
    return this.gabineteService.findAllByTenant(tenantId);
  }
  
}
