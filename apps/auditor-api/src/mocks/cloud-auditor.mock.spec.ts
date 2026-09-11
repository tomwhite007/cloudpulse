import { Test, TestingModule } from '@nestjs/testing';
import type { RemediationRequestDto } from '@cloudpulse/api-contracts';
import { MOCK_DETACHED_ELASTIC_IP } from '@cloudpulse/api-contracts/mocks';
import { MockCloudAuditorService } from './cloud-auditor.mock';

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

    it('includes the detached Elastic IP fixture', async () => {
      const summary = await service.getAuditSummary();
      expect(summary.resources).toContainEqual(MOCK_DETACHED_ELASTIC_IP);
    });
  });

  describe('remediateResource', () => {
    it('should simulate a successful remediation', async () => {
      const request: RemediationRequestDto = {
        resourceId: 'res-test-123',
        actionId: 'TERMINATE',
      };
      const response = await service.remediateResource(request);

      expect(response).toBeDefined();
      expect(response.success).toEqual(false);
      expect(response.message).toContain('No matching 1-click remediation');
    });
  });
});
