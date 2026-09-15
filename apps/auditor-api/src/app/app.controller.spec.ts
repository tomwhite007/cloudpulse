import { Test, TestingModule } from '@nestjs/testing';
import type { RemediationRequestDto } from '@cloudpulse/api-contracts';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CLOUD_AUDITOR_SERVICE } from './cloud-auditor.interface';
import { MockCloudAuditorService } from '../mocks/cloud-auditor.mock';

describe('AppController', () => {
  let appController: AppController;
  const mockCloudAuditorService = {
    getAuditSummary: jest.fn().mockResolvedValue({ totalWaste: 100 }),
    remediateResource: jest.fn().mockResolvedValue({ success: true }),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        MockCloudAuditorService,
        {
          provide: CLOUD_AUDITOR_SERVICE,
          useValue: mockCloudAuditorService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello API"', () => {
      expect(appController.getData()).toEqual({ message: 'Hello API' });
    });
  });

  describe('audit/status', () => {
    it('reports live AWS mode when mode is not demo', () => {
      expect(appController.getAuditStatus('live')).toEqual({
        mode: 'LIVE',
        profile: expect.any(String),
      });
    });

    it('reports SIMULATED mode when mode is demo', () => {
      expect(appController.getAuditStatus('demo')).toEqual({
        mode: 'SIMULATED',
        profile: 'mock',
      });
    });
  });

  describe('audit/summary', () => {
    it('should return audit summary from live cloud auditor when mode is live', async () => {
      const summary = await appController.getAuditSummary('live');
      expect(summary).toEqual({ totalWaste: 100 });
      expect(mockCloudAuditorService.getAuditSummary).toHaveBeenCalled();
    });

    it('should return mock audit summary when mode is demo', async () => {
      const summary = await appController.getAuditSummary('demo');
      expect(summary).toHaveProperty('resources');
      expect(summary).toHaveProperty('totalIdentifiedWaste');
    });
  });

  describe('audit/remediate', () => {
    it('should remediate resource via live cloud auditor when mode is live', async () => {
      const request: RemediationRequestDto = {
        resourceId: 'res-1',
        actionId: 'act-terminate',
      };
      const response = await appController.remediateResource(request, 'live');
      expect(response).toEqual({ success: true });
      expect(mockCloudAuditorService.remediateResource).toHaveBeenCalledWith(request);
    });
  });
});
