import { Test, TestingModule } from '@nestjs/testing';
import { GabineteController } from './gabinete.controller';

describe('GabineteController', () => {
  let controller: GabineteController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GabineteController],
    }).compile();

    controller = module.get<GabineteController>(GabineteController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
