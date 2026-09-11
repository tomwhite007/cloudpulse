import {
  CostAuditSummaryDto,
  CostAuditSummarySchema,
  ResourceStatusCardDto,
  ResourceStatusCardSchema,
} from '../lib/audit.contract';

const DEFAULT_RESOURCE: ResourceStatusCardDto = {
  id: 'res-rds-prod-payments',
  resourceName: 'prod-payments-aurora',
  resourceType: 'RDS',
  status: 'OVER_PROVISIONED',
  region: 'us-east-1',
  monthlyCost: 2840,
  potentialMonthlySavings: 2100,
  telemetrySummary: 'Avg CPU: 11% · Avg memory: 18% · db.r5.4xlarge over 14 days',
  recommendedAction: {
    actionId: 'act-resize-rds-r5-xlarge',
    label: 'Resize Instance',
    actionType: 'RESIZE',
    terraformPatchPreview: `resource "aws_db_instance" "prod_payments" {
  instance_class    = "db.r5.xlarge" # was db.r5.4xlarge
  allocated_storage = 400
}`,
  },
};

type MockResourceStatusCardOverrides = Partial<Omit<ResourceStatusCardDto, 'recommendedAction'>> & {
  recommendedAction?: Partial<ResourceStatusCardDto['recommendedAction']>;
};

export function createMockResourceStatusCard(
  overrides: MockResourceStatusCardOverrides = {},
): ResourceStatusCardDto {
  const { recommendedAction, ...rest } = overrides;
  return ResourceStatusCardSchema.parse({
    ...DEFAULT_RESOURCE,
    ...rest,
    recommendedAction: {
      ...DEFAULT_RESOURCE.recommendedAction,
      ...recommendedAction,
    },
  });
}

export const MOCK_DETACHED_ELASTIC_IP: ResourceStatusCardDto = createMockResourceStatusCard({
  id: 'eipalloc-0123456789abcdef0',
  resourceName: '54.216.0.12',
  resourceType: 'ELASTIC_IP',
  status: 'ZOMBIE',
  region: 'eu-west-1',
  monthlyCost: 3.65,
  potentialMonthlySavings: 3.65,
  telemetrySummary: 'Unattached Elastic IP incurring hourly IPv4 idle reservation penalty.',
  recommendedAction: {
    actionId: 'act-terminate-eip-unattached',
    label: 'Release Elastic IP',
    actionType: 'TERMINATE',
    terraformPatchPreview: `# DELETE unattached Elastic IP eipalloc-0123456789abcdef0 (54.216.0.12)
# resource "aws_eip" "unattached" { ... }`,
  },
});

export const MOCK_AUDIT_RESOURCES: ResourceStatusCardDto[] = [
  createMockResourceStatusCard(),
  createMockResourceStatusCard({
    id: 'res-ebs-analytics-scratch',
    resourceName: 'analytics-scratch-vol-08f2',
    resourceType: 'EBS',
    status: 'ZOMBIE',
    region: 'us-west-2',
    monthlyCost: 950,
    potentialMonthlySavings: 950,
    telemetrySummary: 'Unattached for 42 days · io2 2 TB · zero I/O since last attach',
    recommendedAction: {
      actionId: 'act-terminate-ebs-orphan',
      label: 'Snapshot & Terminate',
      actionType: 'TERMINATE',
      terraformPatchPreview: `# DELETE unattached volume vol-08f2abc (io2, 2TB, unused 42 days)
# resource "aws_ebs_volume" "analytics_scratch" { ... }`,
    },
  }),
  createMockResourceStatusCard({
    id: 'res-ecs-staging-batch',
    resourceName: 'staging-batch-cluster',
    resourceType: 'ECS',
    status: 'IDLE',
    region: 'eu-west-1',
    monthlyCost: 1800,
    potentialMonthlySavings: 1800,
    telemetrySummary: 'Idle staging cluster · 0 running tasks for 16 days · CPU reservation 0%',
    recommendedAction: {
      actionId: 'act-sleep-ecs-staging',
      label: 'Schedule Overnight Sleep',
      actionType: 'SCHEDULE_SLEEP',
      terraformPatchPreview: `resource "aws_ecs_service" "staging_workers" {
  desired_count = 0
  # schedule: scale to 0 from 20:00-08:00 UTC on weekdays and all weekend
}`,
    },
  }),
  MOCK_DETACHED_ELASTIC_IP,
];

export function createMockCostAuditSummary(
  overrides: Partial<CostAuditSummaryDto> = {},
): CostAuditSummaryDto {
  return CostAuditSummarySchema.parse({
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
    resources: MOCK_AUDIT_RESOURCES,
    ...overrides,
  });
}

export const MOCK_COST_AUDIT_SUMMARY: CostAuditSummaryDto = createMockCostAuditSummary();
