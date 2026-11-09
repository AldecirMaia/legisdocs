import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Body() body: Record<string, any>) {
    return this.authService.login(body.email, body.password);
  }

  // NOVO: Rota para registrar usuários a partir do painel de gestão de equipe
  @HttpCode(HttpStatus.CREATED)
  @Post('register')
  registerUser(@Body() body: any) {
    // O body deve conter: name, email, password, role, gabineteId
    // Certifique-se que seu AuthService.register (ou equivalente) saiba lidar com o gabineteId e o tenantId.
    return this.authService.register(body); 
  }
}