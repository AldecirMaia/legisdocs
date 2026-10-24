import { Test, TestingModule } from '@nestjs/testing';
import { GabineteService } from './gabinete.service';

describe('GabineteService', () => {
  let service: GabineteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GabineteService],
    }).compile();

    service = module.get<GabineteService>(GabineteService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
