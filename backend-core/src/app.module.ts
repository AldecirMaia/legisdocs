import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { GabineteModule } from './gabinete/gabinete.module';
import { UserModule } from './user/user.module';
import { SecretariaDestinoModule } from './secretaria-destino/secretaria-destino.module';
import { DocumentModule } from './document/document.module';
import { TenantModule } from './tenant/tenant.module'; 
import { SuperAdminController } from './super-admin/super-admin.controller';
import { VotacaoModule } from './votacao/votacao.module';
import { ComissaoModule } from './comissao/comissao.module';
import { PautaModule } from './pauta/pauta.module'; // O PautaController já está protegido e registado aqui dentro!

@Module({
  imports: [
    AuthModule,
    GabineteModule,
    UserModule,
    SecretariaDestinoModule,
    DocumentModule,
    TenantModule,
    VotacaoModule,
    ComissaoModule,
    PautaModule, // O módulo da pauta traz o controlador e o serviço já encapsulados
  ],
  controllers: [
    AppController,
    SuperAdminController,
    // REMOVIDO DAQUI: PautaController (ele pertence ao PautaModule)
  ],
  providers: [AppService],
})
export class AppModule {}