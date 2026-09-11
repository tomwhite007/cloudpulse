import type { CostAuditSummaryDto } from '@cloudpulse/api-contracts';

export type KpiTone = 'default' | 'warning' | 'success';

export type KpiMetricKey = keyof Pick<
  CostAuditSummaryDto,
  'totalMonthlySpend' | 'totalIdentifiedWaste' | 'activeAssetCount' | 'complianceScorePercent'
>;

export interface KpiItem {
  key: KpiMetricKey;
  label: string;
  format: (summary: CostAuditSummaryDto) => string;
  hint: string | ((summary: CostAuditSummaryDto) => React.ReactNode);
  tone?: KpiTone;
}
