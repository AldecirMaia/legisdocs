import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { TenantService } from './tenant.service';

@Controller('tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get(':id')
  getSettings(@Param('id') id: string) {
    return this.tenantService.getSettings(id);
  }

  @Patch(':id/settings')
  updateSettings(@Param('id') id: string, @Body() body: any) {
    return this.tenantService.updateSettings(id, body);
  }
}