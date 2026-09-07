import { MOCK_COST_AUDIT_SUMMARY } from '@cloudpulse/api-contracts';
import { describe, expect, it } from 'vitest';
import {
  formatCompliancePercent,
  KPI_ITEMS,
  kpiValueClassName,
} from '../utils/kpi-items';

describe('formatCompliancePercent', () => {
  it('appends a percent sign', () => {
    expect(formatCompliancePercent(MOCK_COST_AUDIT_SUMMARY)).toBe('94%');
  });
});

describe('kpiValueClassName', () => {
  it('uses warning, success, and default tones', () => {
    expect(kpiValueClassName('warning')).toContain('text-amber-300');
    expect(kpiValueClassName('success')).toContain('text-emerald-300');
    expect(kpiValueClassName(undefined)).toContain('text-foreground');
    expect(kpiValueClassName('default')).toContain('text-foreground');
  });
});

describe('KPI_ITEMS', () => {
  it('formats each metric from a contract summary', () => {
    const byKey = Object.fromEntries(
      KPI_ITEMS.map((item) => [item.key, item]),
    );

    expect(byKey.totalMonthlySpend.format(MOCK_COST_AUDIT_SUMMARY)).toBe(
      '$18,420.75',
    );
    expect(byKey.totalIdentifiedWaste.format(MOCK_COST_AUDIT_SUMMARY)).toBe(
      '$4,850.00',
    );
    expect(byKey.activeAssetCount.format(MOCK_COST_AUDIT_SUMMARY)).toBe('142');
    expect(byKey.complianceScorePercent.format(MOCK_COST_AUDIT_SUMMARY)).toBe(
      '94%',
    );
  });
});
