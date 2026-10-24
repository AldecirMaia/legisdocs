import { Test, TestingModule } from '@nestjs/testing';
import { ProtocolController } from './protocol.controller.js';

describe('ProtocolController', () => {
  let controller: ProtocolController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProtocolController],
    }).compile();

    controller = module.get<ProtocolController>(ProtocolController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
