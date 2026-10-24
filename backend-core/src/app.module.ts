import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { GabineteModule } from './gabinete/gabinete.module';
import { UserModule } from './user/user.module';
import { SecretariaDestinoModule } from './secretaria-destino/secretaria-destino.module';
import { DocumentModule } from './document/document.module';
import { TenantModule } from './tenant/tenant.module'; // <-- IMPORTAÇÃO AQUI

@Module({
  imports: [
    AuthModule,
    GabineteModule,
    UserModule,
    SecretariaDestinoModule,
    DocumentModule,
    TenantModule, // <-- REGISTO AQUI
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}