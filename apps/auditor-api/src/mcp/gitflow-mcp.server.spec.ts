import { Test, TestingModule } from '@nestjs/testing';
import { GitFlowMcpServer } from './gitflow-mcp.server';
import { CLOUD_AUDITOR_SERVICE } from '../app/cloud-auditor.interface';

describe('GitFlowMcpServer', () => {
  let service: GitFlowMcpServer;
  const mockCloudAuditorService = {
    getAuditSummary: jest.fn().mockResolvedValue({
      resources: [
        {
          id: 'res-1',
          resourceName: 'test-resource',
          potentialMonthlySavings: 100,
          recommendedAction: {
            terraformPatchPreview: '- test\n+ test2',
          },
        },
      ],
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitFlowMcpServer,
        {
          provide: CLOUD_AUDITOR_SERVICE,
          useValue: mockCloudAuditorService,
        },
      ],
    }).compile();

    service = module.get<GitFlowMcpServer>(GitFlowMcpServer);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(service.server).toBeDefined();
  });
});
