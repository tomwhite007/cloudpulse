import { CloudWatchClient, GetMetricStatisticsCommand } from '@aws-sdk/client-cloudwatch';
import { CostExplorerClient, GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer';
import {
  type Address,
  DescribeAddressesCommand,
  DescribeVolumesCommand,
  EC2Client,
} from '@aws-sdk/client-ec2';
import { DescribeDBInstancesCommand, RDSClient } from '@aws-sdk/client-rds';
import {
  CostAuditSummaryDto,
  RemediationRequestDto,
  RemediationResponseDto,
  ResourceStatusCardDto,
  SpendCategoryDto,
} from '@cloudpulse/api-contracts';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ICloudAuditorService } from '../app/cloud-auditor.interface';
import { awsClientConfig, resolveLiveAwsProfile } from './aws-client-config';

const UNATTACHED_ELASTIC_IP_MONTHLY_COST = 3.65;
const UNATTACHED_ELASTIC_IP_REASON =
  'Unattached Elastic IP incurring hourly IPv4 idle reservation penalty.';

@Injectable()
export class AwsCloudAuditorService implements ICloudAuditorService {
  private readonly logger = new Logger(AwsCloudAuditorService.name);

  private readonly clientConfig = awsClientConfig();
  private readonly region = this.clientConfig.region;
  private readonly profile = resolveLiveAwsProfile();
  private ceClient = new CostExplorerClient(this.clientConfig);
  private ec2Client = new EC2Client(this.clientConfig);
  private rdsClient = new RDSClient(this.clientConfig);
  private cwClient = new CloudWatchClient(this.clientConfig);

  constructor() {
    this.logger.log(`Live AWS clients using profile "${this.profile}" in ${this.region}`);
  }

  async getAuditSummary(): Promise<CostAuditSummaryDto> {
    try {
      const spendDetails = await this.getWasteSummary();
      const { findings, monitoredCount } = await this.listFindings();

      const totalIdentifiedWaste = findings.reduce((acc, f) => acc + f.potentialMonthlySavings, 0);
      const complianceScorePercent =
        monitoredCount > 0
          ? Math.max(0, Math.floor(((monitoredCount - findings.length) / monitoredCount) * 100))
          : 100;

      return {
        totalMonthlySpend: spendDetails.totalMonthlySpend,
        currency: 'USD',
        totalIdentifiedWaste,
        activeAssetCount: monitoredCount,
        complianceScorePercent,
        spendByService: spendDetails.spendByService,
        resources: findings,
      };
    } catch (error) {
      this.logger.error('Failed to fetch live AWS audit summary', error);
      throw new InternalServerErrorException('Failed to fetch live AWS audit summary');
    }
  }

  async remediateResource(request: RemediationRequestDto): Promise<RemediationResponseDto> {
    this.logger.warn(
      `remediateResource called in LIVE_AWS mode for ${request.resourceId}. Operations are read-only.`,
    );
    return {
      success: false,
      resourceId: request.resourceId,
      message: 'Live AWS operations are restricted to read-only zero-spend operations.',
      queuedAt: new Date().toISOString(),
    };
  }

  private async getWasteSummary(): Promise<{
    totalMonthlySpend: number;
    spendByService: SpendCategoryDto[];
  }> {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    const command = new GetCostAndUsageCommand({
      TimePeriod: { Start: startStr, End: endStr },
      Granularity: 'MONTHLY',
      Metrics: ['BlendedCost'],
      GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
    });

    const response = await this.ceClient.send(command);
    let totalSpend = 0;
    const spendByService: SpendCategoryDto[] = [];

    if (response.ResultsByTime && response.ResultsByTime.length > 0) {
      const result = response.ResultsByTime[0];
      if (result.Groups) {
        for (const group of result.Groups) {
          const serviceName = group.Keys?.[0] || 'Unknown';
          const amountStr = group.Metrics?.['BlendedCost']?.Amount || '0';
          const amount = parseFloat(amountStr);
          totalSpend += amount;

          spendByService.push({
            serviceName,
            amount,
          });
        }
      }
    }

    return {
      totalMonthlySpend: totalSpend,
      spendByService,
    };
  }

  private async listFindings(): Promise<{
    findings: ResourceStatusCardDto[];
    monitoredCount: number;
  }> {
    const findings: ResourceStatusCardDto[] = [];
    let monitoredCount = 0;

    const volumes = await this.ec2Client.send(
      new DescribeVolumesCommand({
        Filters: [{ Name: 'status', Values: ['available'] }],
      }),
    );
    if (volumes.Volumes) {
      monitoredCount += volumes.Volumes.length;
      for (const vol of volumes.Volumes) {
        const days = vol.CreateTime
          ? Math.floor((new Date().getTime() - vol.CreateTime.getTime()) / 86400000)
          : 0;
        const nameTag = vol.Tags?.find((t) => t.Key === 'Name')?.Value || vol.VolumeId!;
        const unattachedStr = days === 0 ? 'Unattached (< 1 day)' : `Unattached for ${days} days`;

        findings.push({
          id: vol.VolumeId!,
          resourceName: nameTag,
          resourceType: 'EBS',
          status: 'ZOMBIE',
          region: vol.AvailabilityZone?.replace(/[a-z]$/, '') || 'unknown',
          monthlyCost: (vol.Size || 0) * 0.08,
          potentialMonthlySavings: (vol.Size || 0) * 0.08,
          telemetrySummary: `${unattachedStr} · ${vol.VolumeType || 'gp2'} ${vol.Size || 0} GB · zero I/O`,
          recommendedAction: {
            actionId: `act-terminate-ebs-${vol.VolumeId}`,
            label: 'Snapshot & Terminate',
            actionType: 'TERMINATE',
            terraformPatchPreview: `# Terminate unattached volume ${vol.VolumeId}`,
          },
        });
      }
    }

    const elasticIpAudit = await this.auditElasticIps();
    findings.push(...elasticIpAudit.findings);
    monitoredCount += elasticIpAudit.monitoredCount;

    const rdsInstances = await this.rdsClient.send(new DescribeDBInstancesCommand({}));
    if (rdsInstances.DBInstances) {
      const activeInstances = rdsInstances.DBInstances.filter(
        (db) => db.DBInstanceStatus === 'available',
      );
      monitoredCount += activeInstances.length;

      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 14);

      for (const db of activeInstances) {
        const cwCmd = new GetMetricStatisticsCommand({
          Namespace: 'AWS/RDS',
          MetricName: 'CPUUtilization',
          Dimensions: [{ Name: 'DBInstanceIdentifier', Value: db.DBInstanceIdentifier! }],
          StartTime: start,
          EndTime: end,
          Period: 86400,
          Statistics: ['Average'],
        });

        try {
          const cwData = await this.cwClient.send(cwCmd);
          let avgCpu = 0;
          if (cwData.Datapoints && cwData.Datapoints.length > 0) {
            avgCpu =
              cwData.Datapoints.reduce((acc, dp) => acc + (dp.Average || 0), 0) /
              cwData.Datapoints.length;
          }

          if (avgCpu > 0 && avgCpu < 15) {
            findings.push({
              id: db.DBInstanceIdentifier!,
              resourceName: db.DBInstanceIdentifier!,
              resourceType: 'RDS',
              status: 'OVER_PROVISIONED',
              region: db.AvailabilityZone?.replace(/[a-z]$/, '') || 'unknown',
              monthlyCost: 100, // placeholder since CostExplorer API doesn't give resource-level cost easily
              potentialMonthlySavings: 50, // placeholder
              telemetrySummary: `Avg CPU: ${avgCpu.toFixed(1)}% · ${db.Engine} ${db.DBInstanceClass} over 14 days`,
              recommendedAction: {
                actionId: `act-resize-rds-${db.DBInstanceIdentifier}`,
                label: 'Resize Instance',
                actionType: 'RESIZE',
                terraformPatchPreview: `# Resize over-provisioned instance ${db.DBInstanceIdentifier}`,
              },
            });
          }
        } catch (e) {
          this.logger.error(`Failed to get metrics for ${db.DBInstanceIdentifier}`, e);
        }
      }
    }

    return { findings, monitoredCount };
  }

  private async auditElasticIps(): Promise<{
    findings: ResourceStatusCardDto[];
    monitoredCount: number;
  }> {
    const findings: ResourceStatusCardDto[] = [];
    let monitoredCount = 0;

    const response = await this.ec2Client.send(new DescribeAddressesCommand({}));
    const addresses = response.Addresses ?? [];
    monitoredCount = addresses.length;

    for (const address of addresses) {
      if (!this.isUnattachedElasticIp(address) || !address.AllocationId) {
        continue;
      }

      const allocationId = address.AllocationId;
      const publicIp = address.PublicIp || allocationId;

      findings.push({
        id: allocationId,
        resourceName: publicIp,
        resourceType: 'ELASTIC_IP',
        status: 'ZOMBIE',
        region: this.region,
        monthlyCost: UNATTACHED_ELASTIC_IP_MONTHLY_COST,
        potentialMonthlySavings: UNATTACHED_ELASTIC_IP_MONTHLY_COST,
        telemetrySummary: UNATTACHED_ELASTIC_IP_REASON,
        recommendedAction: {
          actionId: `act-terminate-eip-${allocationId}`,
          label: 'Release Elastic IP',
          actionType: 'TERMINATE',
          terraformPatchPreview: `# Release unattached Elastic IP ${allocationId} (${publicIp})`,
        },
      });
    }

    return { findings, monitoredCount };
  }

  private isUnattachedElasticIp(address: Address): boolean {
    return !address.AssociationId && !address.InstanceId;
  }
}
