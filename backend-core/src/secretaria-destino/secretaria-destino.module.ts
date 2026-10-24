import { Module } from '@nestjs/common';
import { SecretariaDestinoController } from './secretaria-destino.controller';
import { SecretariaDestinoService } from './secretaria-destino.service';

@Module({
  controllers: [SecretariaDestinoController],
  providers: [SecretariaDestinoService]
})
export class SecretariaDestinoModule {}
