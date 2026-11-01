import { Module } from '@nestjs/common';
import { VotacaoGateway } from './votacao.gateway';
import { VotacaoController } from './votacao.controller';

@Module({
  controllers: [VotacaoController],
  providers: [VotacaoGateway],
})
export class VotacaoModule {}