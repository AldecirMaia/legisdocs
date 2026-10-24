import { Module } from '@nestjs/common';
import { ProtocolService } from './protocol.service.js';
import { ProtocolController } from './protocol.controller.js';

@Module({
  providers: [ProtocolService],
  controllers: [ProtocolController]
})
export class ProtocolModule {}
