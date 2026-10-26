import { Controller, Get, Post, Patch, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Controller('super-admin')
export class SuperAdminController {
  
  @Get('tenants')
  async getTenants() {
    return prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: { 
        _count: { select: { gabinetes: true, users: true } }, // Traz a contagem de gabinetes e utilizadores
      }
    });
  }

  @Post('tenants')
  async createTenant(@Body() body: any) {
    const { name, slug, adminName, adminEmail, adminPassword } = body;
    
    const existingTenant = await prisma.tenant.findUnique({ where: { slug } });
    if (existingTenant) throw new HttpException('Slug já em uso', HttpStatus.BAD_REQUEST);

    const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existingUser) throw new HttpException('Email já em uso', HttpStatus.BAD_REQUEST);

    return prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({ data: { name, slug, isActive: true } });
      await tx.user.create({
        data: { name: adminName, email: adminEmail, password: adminPassword, role: 'SECRETARIA', tenantId: tenant.id, isActive: true }
      });
      return tenant;
    });
  }

  @Patch('tenants/:id')
  async updateTenant(@Param('id') id: string, @Body() body: any) {
    return prisma.tenant.update({ where: { id }, data: { name: body.name, slug: body.slug } });
  }

  @Patch('tenants/:id/status')
  async toggleStatus(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return prisma.tenant.update({ where: { id }, data: { isActive: body.isActive } });
  }

  // --- NOVAS ROTAS PARA GESTÃO DE UTILIZADORES ---

  @Get('tenants/:id/users')
  async getTenantUsers(@Param('id') id: string) {
    return prisma.user.findMany({
      where: { tenantId: id },
      include: { gabinete: true }, // Traz os dados do gabinete associado (se existir)
      orderBy: { role: 'asc' }
    });
  }

  @Patch('users/:id/status')
  async toggleUserStatus(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return prisma.user.update({ where: { id }, data: { isActive: body.isActive } });
  }

  @Patch('users/:id/password')
  async updateUserPassword(@Param('id') id: string, @Body() body: { newPassword: string }) {
    return prisma.user.update({ where: { id }, data: { password: body.newPassword } });
  }
}