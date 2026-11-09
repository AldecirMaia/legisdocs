import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient, Role } from '@prisma/client';

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

  // NOVO: Método responsável por registrar membros do gabinete
  async register(data: { name: string; email: string; password: string; role: string; gabineteId: string }) {
    // 1. Verifica se o e-mail já está cadastrado
    const userExists = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (userExists) {
      throw new ConflictException('Este e-mail já está em uso por outro utilizador.');
    }

    // 2. Busca o gabinete para herdar o tenantId correto
    const gabinete = await prisma.gabinete.findUnique({
      where: { id: data.gabineteId },
    });

    if (!gabinete) {
      throw new NotFoundException('Gabinete não encontrado.');
    }

    // 3. Cria o novo usuário vinculando ao Gabinete e ao Tenant
    const newUser = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: data.password, // Mantido em texto plano conforme sua regra atual do login
        role: data.role as Role,
        tenantId: gabinete.tenantId,
        gabineteId: data.gabineteId,
      },
    });

    // Remove a senha do objeto de retorno por segurança
    const { password, ...result } = newUser;
    return result;
  }
}