import { Test, TestingModule } from '@nestjs/testing';
import { SecretariaDestinoService } from './secretaria-destino.service';

describe('SecretariaDestinoService', () => {
  let service: SecretariaDestinoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SecretariaDestinoService],
    }).compile();

    service = module.get<SecretariaDestinoService>(SecretariaDestinoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
