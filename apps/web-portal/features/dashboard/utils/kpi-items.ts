import type { CostAuditSummaryDto } from '@cloudpulse/api-contracts';
import type { KpiItem, KpiTone } from '../components/kpi-grid.types';
import { formatInteger, formatUsd } from './format';

export function formatCompliancePercent(summary: CostAuditSummaryDto) {
  return `${summary.complianceScorePercent}%`;
}

export function kpiValueClassName(tone: KpiTone | undefined) {
  if (tone === 'warning') {
    return 'mt-2 text-2xl font-semibold tracking-tight text-amber-300';
  }
  if (tone === 'success') {
    return 'mt-2 text-2xl font-semibold tracking-tight text-emerald-300';
  }
  return 'mt-2 text-2xl font-semibold tracking-tight text-foreground';
}

export const KPI_ITEMS: readonly KpiItem[] = [
  {
    key: 'totalMonthlySpend',
    label: 'Total Monthly Spend',
    format: (summary) => formatUsd(summary.totalMonthlySpend),
    hint: 'Trailing 30-day cloud invoice',
  },
  {
    key: 'totalIdentifiedWaste',
    label: 'Identified Monthly Waste',
    format: (summary) => formatUsd(summary.totalIdentifiedWaste),
    hint: 'Recoverable run-rate from findings',
    tone: 'warning',
  },
  {
    key: 'activeAssetCount',
    label: 'Monitored Cloud Assets',
    format: (summary) => formatInteger(summary.activeAssetCount),
    hint: 'Resources under continuous audit',
  },
  {
    key: 'complianceScorePercent',
    label: 'FinOps Compliance Score',
    format: formatCompliancePercent,
    hint: 'Policy adherence across estates',
    tone: 'success',
  },
];
