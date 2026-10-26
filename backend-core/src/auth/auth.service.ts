import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async login(email: string, pass: string) {
    // 1. Incluir os dados do Tenant na busca para verificar o status
    const user = await prisma.user.findUnique({ 
      where: { email },
      include: { tenant: true } 
    });
    
    if (!user) {
      throw new UnauthorizedException('E-mail não encontrado');
    }

    if (user.password !== pass) {
      throw new UnauthorizedException('Palavra-passe incorreta');
    }

    // 2. NOVA REGRA: Bloquear o acesso se a Câmara (Tenant) estiver inativa
    // O SUPER_ADMIN tem imunidade para nunca ficar trancado fora do sistema
    if (user.role !== 'SUPER_ADMIN' && user.tenant && user.tenant.isActive === false) {
      throw new UnauthorizedException('O acesso desta Câmara encontra-se suspenso.');
    }
    if (user.role !== 'SUPER_ADMIN' && user.isActive === false) {
      throw new UnauthorizedException('O seu acesso de utilizador foi bloqueado pelo administrador.');
    }

    const payload = { 
      sub: user.id, 
      email: user.email, 
      role: user.role, 
      tenantId: user.tenantId,
      gabineteId: user.gabineteId 
    };
    
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        gabineteId: user.gabineteId
      }
    };
  }
}