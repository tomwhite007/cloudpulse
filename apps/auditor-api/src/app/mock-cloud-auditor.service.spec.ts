import { Test, TestingModule } from '@nestjs/testing';
import { MockCloudAuditorService } from './mock-cloud-auditor.service';

describe('MockCloudAuditorService', () => {
  let service: MockCloudAuditorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MockCloudAuditorService],
    }).compile();

    service = module.get<MockCloudAuditorService>(MockCloudAuditorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAuditSummary', () => {
    it('should return a valid mock audit summary', async () => {
      const summary = await service.getAuditSummary();
      expect(summary).toBeDefined();
      expect(summary.resources).toBeInstanceOf(Array);
      expect(summary.totalMonthlySpend).toBeDefined();
    });
  });

  describe('remediateResource', () => {
    it('should simulate a successful remediation', async () => {
      const request: any = { resourceId: 'res-test-123', actionId: 'TERMINATE' };
      const response = await service.remediateResource(request);
      
      expect(response).toBeDefined();
      expect(response.success).toEqual(false);
      expect(response.message).toContain('No matching 1-click remediation');
    });
  });
});
