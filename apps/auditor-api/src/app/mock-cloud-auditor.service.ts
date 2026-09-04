import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CostAuditSummaryDto,
  CostAuditSummarySchema,
  RemediationRequestDto,
  RemediationRequestSchema,
  RemediationResponseDto,
  ResourceStatusCardDto,
} from '@cloudpulse/api-contracts';
import { ICloudAuditorService } from './cloud-auditor.interface';

const MOCK_RESOURCES: ResourceStatusCardDto[] = [
  {
    id: 'res-rds-prod-payments',
    resourceName: 'prod-payments-aurora',
    resourceType: 'RDS',
    status: 'OVER_PROVISIONED',
    region: 'us-east-1',
    monthlyCost: 2840,
    potentialMonthlySavings: 2100,
    telemetrySummary:
      'db.r5.4xlarge averaging 11% CPU and 18% memory over 14 days. Read IOPS well below provisioned baseline.',
    recommendedAction: {
      actionId: 'act-resize-rds-r5-xlarge',
      label: 'Resize to db.r5.xlarge',
      actionType: 'RESIZE',
      terraformPatchPreview: `resource "aws_db_instance" "prod_payments" {
  instance_class    = "db.r5.xlarge" # was db.r5.4xlarge
  allocated_storage = 400
}`,
    },
  },
  {
    id: 'res-ebs-analytics-scratch',
    resourceName: 'analytics-scratch-vol-08f2',
    resourceType: 'EBS',
    status: 'ZOMBIE',
    region: 'us-west-2',
    monthlyCost: 950,
    potentialMonthlySavings: 950,
    telemetrySummary:
      'Unattached io2 volume (2 TB) with zero I/O for 47 days. Last attached instance terminated.',
    recommendedAction: {
      actionId: 'act-terminate-ebs-orphan',
      label: 'Terminate unattached volume',
      actionType: 'TERMINATE',
      terraformPatchPreview: `# DELETE unattached volume vol-08f2abc (io2, 2TB, unused 47 days)
# resource "aws_ebs_volume" "analytics_scratch" { ... }`,
    },
  },
  {
    id: 'res-ecs-staging-batch',
    resourceName: 'staging-batch-cluster',
    resourceType: 'ECS',
    status: 'IDLE',
    region: 'eu-west-1',
    monthlyCost: 1800,
    potentialMonthlySavings: 1800,
    telemetrySummary:
      'Fargate service desired count 6 with 0 running tasks for 16 days. Cluster CPU reservation at 0%.',
    recommendedAction: {
      actionId: 'act-sleep-ecs-staging',
      label: 'Schedule overnight sleep',
      actionType: 'SCHEDULE_SLEEP',
      terraformPatchPreview: `resource "aws_ecs_service" "staging_workers" {
  desired_count = 0
  # schedule: scale to 0 from 20:00-08:00 UTC on weekdays and all weekend
}`,
    },
  },
];

const MOCK_AUDIT_SUMMARY: CostAuditSummaryDto = CostAuditSummarySchema.parse({
  totalMonthlySpend: 18420.75,
  currency: 'USD',
  totalIdentifiedWaste: 4850,
  activeAssetCount: 142,
  complianceScorePercent: 94,
  spendByService: [
    { serviceName: 'Amazon RDS', amount: 6840 },
    { serviceName: 'Amazon EC2', amount: 5120.5 },
    { serviceName: 'Amazon ECS', amount: 3410.25 },
    { serviceName: 'Amazon EBS', amount: 2050 },
    { serviceName: 'AWS Lambda', amount: 1000 },
  ],
  resources: MOCK_RESOURCES,
});

@Injectable()
export class MockCloudAuditorService implements ICloudAuditorService {
  async getAuditSummary(): Promise<CostAuditSummaryDto> {
    return MOCK_AUDIT_SUMMARY;
  }

  async remediateResource(
    request: RemediationRequestDto,
  ): Promise<RemediationResponseDto> {
    const parsed = RemediationRequestSchema.safeParse(request);
    if (!parsed.success) {
      throw new BadRequestException('Invalid remediation request.');
    }

    const { resourceId, actionId } = parsed.data;
    const resource = MOCK_RESOURCES.find((item) => item.id === resourceId);
    const actionMatches = resource?.recommendedAction.actionId === actionId;

    if (!resource || !actionMatches) {
      return {
        success: false,
        resourceId,
        message: `No matching 1-click remediation found for resource ${resourceId}.`,
        queuedAt: new Date().toISOString(),
      };
    }

    return {
      success: true,
      resourceId,
      message: `Queued ${resource.recommendedAction.label} for ${resource.resourceName}. Terraform patch will apply in the next plan.`,
      queuedAt: new Date().toISOString(),
    };
  }
}
