import { Test, TestingModule } from '@nestjs/testing';
import type { RemediationRequestDto } from '@cloudpulse/api-contracts';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CLOUD_AUDITOR_SERVICE } from './cloud-auditor.interface';

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

  describe('audit/summary', () => {
    it('should return audit summary from cloud auditor', async () => {
      const summary = await appController.getAuditSummary();
      expect(summary).toEqual({ totalWaste: 100 });
      expect(mockCloudAuditorService.getAuditSummary).toHaveBeenCalled();
    });
  });

  describe('audit/remediate', () => {
    it('should remediate resource via cloud auditor', async () => {
      const request: RemediationRequestDto = {
        resourceId: 'res-1',
        actionId: 'act-terminate',
      };
      const response = await appController.remediateResource(request);
      expect(response).toEqual({ success: true });
      expect(mockCloudAuditorService.remediateResource).toHaveBeenCalledWith(request);
    });
  });
});
