import { Test, TestingModule } from '@nestjs/testing';
import { SecretariaDestinoController } from './secretaria-destino.controller';

describe('SecretariaDestinoController', () => {
  let controller: SecretariaDestinoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SecretariaDestinoController],
    }).compile();

    controller = module.get<SecretariaDestinoController>(SecretariaDestinoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
