import { Test, TestingModule } from '@nestjs/testing';
import { McpController } from './mcp.controller';
import { GitFlowMcpServer } from './gitflow-mcp.server';
import { CLOUD_AUDITOR_SERVICE } from '../app/cloud-auditor.interface';

describe('McpController', () => {
  let controller: McpController;
  const mockCloudAuditorService = {
    getAuditSummary: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [McpController],
      providers: [
        GitFlowMcpServer,
        {
          provide: CLOUD_AUDITOR_SERVICE,
          useValue: mockCloudAuditorService,
        },
      ],
    }).compile();

    controller = module.get<McpController>(McpController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
