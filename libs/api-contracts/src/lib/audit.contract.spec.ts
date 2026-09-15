import {
  CloudResourceTypeSchema,
  CostAuditSummarySchema,
  RemediationRequestSchema,
  ResourceStatusCardSchema,
} from './audit.contract';

describe('audit contracts', () => {
  it('parses a resource status card', () => {
    const card = ResourceStatusCardSchema.parse({
      id: 'res-1',
      resourceName: 'example',
      resourceType: 'RDS',
      status: 'OVER_PROVISIONED',
      region: 'us-east-1',
      monthlyCost: 100,
      potentialMonthlySavings: 40,
      telemetrySummary: 'low utilisation',
      recommendedAction: {
        actionId: 'act-1',
        label: 'Resize',
        actionType: 'RESIZE',
        terraformPatchPreview: 'instance_class = "db.r5.large"',
      },
    });

    expect(card.resourceType).toBe('RDS');
  });

  it('accepts ELASTIC_IP as a cloud resource type in audit payloads', () => {
    expect(CloudResourceTypeSchema.parse('ELASTIC_IP')).toBe('ELASTIC_IP');
    expect(() => CloudResourceTypeSchema.parse('EIP')).toThrow();

    const card = ResourceStatusCardSchema.parse({
      id: 'eipalloc-0123456789abcdef0',
      resourceName: '54.216.0.12',
      resourceType: 'ELASTIC_IP',
      status: 'ZOMBIE',
      region: 'eu-west-1',
      monthlyCost: 3.65,
      potentialMonthlySavings: 3.65,
      telemetrySummary: 'Unattached Elastic IP incurring hourly IPv4 idle reservation penalty.',
      recommendedAction: {
        actionId: 'act-terminate-eip',
        label: 'Release Elastic IP',
        actionType: 'TERMINATE',
        terraformPatchPreview: '# Release unattached Elastic IP',
      },
    });

    expect(card.resourceType).toBe('ELASTIC_IP');
    expect(card.status).toBe('ZOMBIE');
    expect(card.monthlyCost).toBe(3.65);
  });

  it('parses a cost audit summary with the Day 2 KPI targets', () => {
    const summary = CostAuditSummarySchema.parse({
      totalMonthlySpend: 18420.75,
      currency: 'USD',
      totalIdentifiedWaste: 4850,
      activeAssetCount: 142,
      complianceScorePercent: 94,
      spendByService: [{ serviceName: 'Amazon RDS', amount: 6840 }],
      resources: [],
    });

    expect(summary.currency).toBe('USD');
    expect(summary.totalMonthlySpend).toBe(18420.75);
  });

  it('rejects an incomplete remediation request', () => {
    expect(() => RemediationRequestSchema.parse({ resourceId: 'res-1' })).toThrow();
  });
});
