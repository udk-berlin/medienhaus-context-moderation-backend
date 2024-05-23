import { Test, TestingModule } from '@nestjs/testing';
import { EmailLookupService } from './email-lookup.service';

describe('EmailLookupService', () => {
  let service: EmailLookupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailLookupService],
    }).compile();

    service = module.get<EmailLookupService>(EmailLookupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
