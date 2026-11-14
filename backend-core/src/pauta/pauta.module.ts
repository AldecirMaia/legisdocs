import { Module } from '@nestjs/common';
import { PautaController } from './pauta.controller';
import { PautaService } from './pauta.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [PautaController],
  providers: [
    PautaService, // <--- O NestJS precisa disto para resolver o índice [0] do controlador
    PrismaService  // <--- O NestJS precisa disto para resolver o índice [1] do controlador
  ],
  exports: [PautaService],
})
export class PautaModule {}