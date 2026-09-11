import {
  createMockCostAuditSummary,
  createMockResourceStatusCard,
  MOCK_COST_AUDIT_SUMMARY,
} from './audit.mock';

describe('audit mock fixtures', () => {
  it('exposes Day 3 mock fixtures matching the KPI targets', () => {
    expect(MOCK_COST_AUDIT_SUMMARY.totalMonthlySpend).toBe(18420.75);
    expect(MOCK_COST_AUDIT_SUMMARY.totalIdentifiedWaste).toBe(4850);
    expect(MOCK_COST_AUDIT_SUMMARY.activeAssetCount).toBe(142);
    expect(MOCK_COST_AUDIT_SUMMARY.complianceScorePercent).toBe(94);
    expect(MOCK_COST_AUDIT_SUMMARY.resources).toHaveLength(3);
  });

  it('creates a resource card with overrides', () => {
    const card = createMockResourceStatusCard({
      id: 'custom-rds',
      resourceName: 'custom-rds',
      recommendedAction: { actionId: 'act-custom' },
    });

    expect(card.id).toBe('custom-rds');
    expect(card.resourceName).toBe('custom-rds');
    expect(card.resourceType).toBe('RDS');
    expect(card.recommendedAction.actionId).toBe('act-custom');
    expect(card.recommendedAction.label).toBe('Resize Instance');
  });

  it('creates a cost audit summary with overrides', () => {
    const summary = createMockCostAuditSummary({
      totalMonthlySpend: 1,
      resources: [],
    });

    expect(summary.totalMonthlySpend).toBe(1);
    expect(summary.resources).toEqual([]);
    expect(summary.currency).toBe('USD');
  });
});
