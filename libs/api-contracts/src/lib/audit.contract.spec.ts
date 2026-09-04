import {
  CostAuditSummarySchema,
  RemediationRequestSchema,
  ResourceStatusCardSchema,
} from './audit.contract';
import { MOCK_COST_AUDIT_SUMMARY } from './audit.mock';

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
      telemetrySummary: 'low utilization',
      recommendedAction: {
        actionId: 'act-1',
        label: 'Resize',
        actionType: 'RESIZE',
        terraformPatchPreview: 'instance_class = "db.r5.large"',
      },
    });

    expect(card.resourceType).toBe('RDS');
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

  it('exposes Day 3 mock fixtures matching the KPI targets', () => {
    expect(MOCK_COST_AUDIT_SUMMARY.totalMonthlySpend).toBe(18420.75);
    expect(MOCK_COST_AUDIT_SUMMARY.totalIdentifiedWaste).toBe(4850);
    expect(MOCK_COST_AUDIT_SUMMARY.activeAssetCount).toBe(142);
    expect(MOCK_COST_AUDIT_SUMMARY.complianceScorePercent).toBe(94);
    expect(MOCK_COST_AUDIT_SUMMARY.resources).toHaveLength(3);
  });

  it('rejects an incomplete remediation request', () => {
    expect(() =>
      RemediationRequestSchema.parse({ resourceId: 'res-1' }),
    ).toThrow();
  });
});
