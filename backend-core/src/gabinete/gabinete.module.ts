import { Module } from '@nestjs/common';
import { GabineteController } from './gabinete.controller';
import { GabineteService } from './gabinete.service';

@Module({
  controllers: [GabineteController],
  providers: [GabineteService]
})
export class GabineteModule {}
