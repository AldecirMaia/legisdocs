import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async login(email: string, pass: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      throw new UnauthorizedException('E-mail não encontrado');
    }

    if (user.password !== pass) {
      throw new UnauthorizedException('Palavra-passe incorreta');
    }

    // Adicionado gabineteId ao payload do token
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
        gabineteId: user.gabineteId // <-- Informação crucial adicionada aqui
      }
    };
  }
}