import { TextDecoder, TextEncoder } from 'util';
Object.assign(global, { TextDecoder, TextEncoder });

import { InternalServerErrorException } from '@nestjs/common';
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
  const originalProfile = process.env.AWS_PROFILE;
  const originalRegion = process.env.AWS_REGION;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AwsCloudAuditorService],
    }).compile();

    service = module.get<AwsCloudAuditorService>(AwsCloudAuditorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (originalProfile === undefined) {
      delete process.env.AWS_PROFILE;
    } else {
      process.env.AWS_PROFILE = originalProfile;
    }
    if (originalRegion === undefined) {
      delete process.env.AWS_REGION;
    } else {
      process.env.AWS_REGION = originalRegion;
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAuditSummary', () => {
    it('should throw when AWS clients fail', async () => {
      CostExplorerClient.prototype.send = jest.fn().mockRejectedValue(new Error('AccessDenied'));
      EC2Client.prototype.send = jest.fn().mockRejectedValue(new Error('AccessDenied'));
      RDSClient.prototype.send = jest.fn().mockRejectedValue(new Error('AccessDenied'));

      await expect(service.getAuditSummary()).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it('should return combined data when clients succeed', async () => {
      CostExplorerClient.prototype.send = jest.fn().mockResolvedValue({
        ResultsByTime: [
          {
            Groups: [
              {
                Keys: ['Amazon EC2'],
                Metrics: { BlendedCost: { Amount: '100.50' } },
              },
            ],
          },
        ],
      });

      EC2Client.prototype.send = jest.fn().mockResolvedValue({
        Volumes: [
          {
            VolumeId: 'vol-123',
            Size: 100,
            AvailabilityZone: 'us-east-1a',
            CreateTime: new Date(Date.now() - 86400000 * 5), // 5 days ago
            VolumeType: 'gp3',
          },
        ],
        Addresses: [
          {
            AllocationId: 'eipalloc-0123456789abcdef0',
            PublicIp: '54.216.0.12',
          },
          {
            AllocationId: 'eipalloc-attached',
            PublicIp: '1.2.3.4',
            AssociationId: 'eipassoc-123',
            InstanceId: 'i-123',
          },
        ],
      });

      RDSClient.prototype.send = jest.fn().mockResolvedValue({
        DBInstances: [
          {
            DBInstanceIdentifier: 'db-123',
            DBInstanceStatus: 'available',
            AvailabilityZone: 'us-east-1a',
            DBInstanceClass: 'db.m5.large',
            Engine: 'postgres',
          },
        ],
      });

      CloudWatchClient.prototype.send = jest.fn().mockResolvedValue({
        Datapoints: [{ Average: 10 }],
      });

      const result = await service.getAuditSummary();

      expect(result.totalMonthlySpend).toBe(100.5);
      expect(result.resources).toHaveLength(3); // 1 EBS, 1 unattached EIP, 1 RDS
      expect(result.spendByService).toHaveLength(1);
      expect(result.activeAssetCount).toBe(4); // 1 EBS + 2 EIPs + 1 RDS
      expect(result.complianceScorePercent).toBe(25); // 4 assets, 3 waste -> 25%

      const elasticIp = result.resources.find((resource) => resource.resourceType === 'ELASTIC_IP');
      expect(elasticIp).toMatchObject({
        id: 'eipalloc-0123456789abcdef0',
        resourceName: '54.216.0.12',
        status: 'ZOMBIE',
        monthlyCost: 3.65,
        potentialMonthlySavings: 3.65,
        telemetrySummary: 'Unattached Elastic IP incurring hourly IPv4 idle reservation penalty.',
      });
      expect(result.resources.some((resource) => resource.id === 'eipalloc-attached')).toBe(false);
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
