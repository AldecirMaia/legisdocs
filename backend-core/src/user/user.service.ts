import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class UserService {
  
  async create(data: { name: string; email: string; password: string; role: Role; tenantId: string; gabineteId: string }) {
    // Verifica se o e-mail já existe no sistema
    const userExists = await prisma.user.findUnique({ where: { email: data.email } });
    if (userExists) {
      throw new ConflictException('Este e-mail já está em uso.');
    }

    return await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: data.password, // No futuro aplicaremos criptografia (bcrypt) aqui
        role: data.role,
        tenantId: data.tenantId,
        gabineteId: data.gabineteId,
      },
      // Devolvemos apenas os dados seguros (sem a password)
      select: { id: true, name: true, email: true, role: true, isActive: true }
    });
  }

  async findByGabinete(gabineteId: string) {
    return await prisma.user.findMany({
      where: { gabineteId },
      select: { id: true, name: true, email: true, role: true, isActive: true },
      orderBy: { name: 'asc' }
    });
  }
  async updateUser(id: string, data: { name?: string; email?: string; role?: string; password?: string }) {
    const updateData: any = { ...data };
    
    if (!data.password) delete updateData.password;

    return await prisma.user.update({
      where: { id },
      data: updateData,
    });
  }
}