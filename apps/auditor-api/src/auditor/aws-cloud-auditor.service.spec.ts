import { TextDecoder, TextEncoder } from 'util';
Object.assign(global, { TextDecoder, TextEncoder });

import { Test, TestingModule } from '@nestjs/testing';
import { AwsCloudAuditorService } from './aws-cloud-auditor.service';
import { CostExplorerClient } from '@aws-sdk/client-cost-explorer';
import { EC2Client } from '@aws-sdk/client-ec2';
import { RDSClient } from '@aws-sdk/client-rds';
import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';

// Mock the AWS clients
jest.mock('@aws-sdk/client-cost-explorer');
jest.mock('@aws-sdk/client-ec2');
jest.mock('@aws-sdk/client-rds');
jest.mock('@aws-sdk/client-cloudwatch');

describe('AwsCloudAuditorService', () => {
  let service: AwsCloudAuditorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AwsCloudAuditorService],
    }).compile();

    service = module.get<AwsCloudAuditorService>(AwsCloudAuditorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAuditSummary', () => {
    it('should fallback gracefully when AWS clients fail', async () => {
      // Mock failure
      CostExplorerClient.prototype.send = jest.fn().mockRejectedValue(new Error('AccessDenied'));

      const result = await service.getAuditSummary();
      
      expect(result.totalMonthlySpend).toBe(0);
      expect(result.resources).toEqual([]);
      expect(result.spendByService).toEqual([]);
    });

    it('should return combined data when clients succeed', async () => {
      CostExplorerClient.prototype.send = jest.fn().mockResolvedValue({
        ResultsByTime: [{
          Groups: [{
            Keys: ['Amazon EC2'],
            Metrics: { BlendedCost: { Amount: '100.50' } }
          }]
        }]
      });

      EC2Client.prototype.send = jest.fn().mockResolvedValue({
        Volumes: [{
          VolumeId: 'vol-123',
          Size: 100,
        }]
      });

      RDSClient.prototype.send = jest.fn().mockResolvedValue({
        DBInstances: [{
          DBInstanceIdentifier: 'db-123',
          AvailabilityZone: 'us-east-1a'
        }]
      });

      CloudWatchClient.prototype.send = jest.fn().mockResolvedValue({
        Datapoints: [{ Average: 10 }]
      });

      const result = await service.getAuditSummary();
      
      expect(result.totalMonthlySpend).toBe(100.50);
      expect(result.resources).toHaveLength(2); // 1 EBS, 1 RDS
      expect(result.spendByService).toHaveLength(1);
    });
  });

  describe('remediateResource', () => {
    it('should return a read-only message', async () => {
      const result = await service.remediateResource({ resourceId: 'res-1', actionId: 'act-1' });
      expect(result.success).toBe(false);
      expect(result.message).toContain('read-only');
    });
  });
});
