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
import { PautaController } from './pauta/pauta.controller';
import { ComissaoModule } from './comissao/comissao.module'; // <-- Correção: final '.module' em vez de '.controller' // <-- Adicionei o import do PautaController

@Module({
  imports: [
    AuthModule,
    GabineteModule,
    UserModule,
    SecretariaDestinoModule,
    DocumentModule,
    TenantModule,
    VotacaoModule,
    ComissaoModule, // <-- Adicionei o PautaModule aqui
     
  ],
  controllers: [
    AppController,
    SuperAdminController,
    PautaController,// <-- O REGISTO CORRETO É AQUI!
  ],
  providers: [AppService],
})
export class AppModule {}