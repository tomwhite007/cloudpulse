'use client';

import type { CostAuditSummaryDto } from '@cloudpulse/api-contracts';
import {
  DollarSign,
  Leaf,
  Server,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuditSummary, useAuditStatus } from '../hooks/use-audit-data';
import { formatInteger, formatUsd } from '../utils/format';
import type { KpiItem, KpiMetricKey, KpiTone } from './kpi-grid.types';

function formatCompliancePercent(summary: CostAuditSummaryDto) {
  if (summary.activeAssetCount === 0) return 'N/A';
  return `${summary.complianceScorePercent}%`;
}

function kpiValueClassName(tone: KpiTone | undefined) {
  if (tone === 'warning') {
    return 'mt-2 text-2xl font-semibold tracking-tight text-amber-300';
  }
  if (tone === 'success') {
    return 'mt-2 text-2xl font-semibold tracking-tight text-emerald-300';
  }
  return 'mt-2 text-2xl font-semibold tracking-tight text-foreground';
}

const KPI_ITEMS: readonly KpiItem[] = [
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

const KPI_ICONS: Record<KpiMetricKey, LucideIcon> = {
  totalMonthlySpend: DollarSign,
  totalIdentifiedWaste: Leaf,
  activeAssetCount: Server,
  complianceScorePercent: ShieldCheck,
};

export function KpiGrid({
  summary,
}: {
  summary: CostAuditSummaryDto | undefined;
}) {
  const { data: statusData } = useAuditStatus();

  return (
    <section aria-label="FinOps KPI metrics">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_ITEMS.map((item) => {
          const Icon = KPI_ICONS[item.key];
          return (
            <Card key={item.key} className="bg-card/80">
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {item.label}
                  </CardTitle>
                  {summary ? (
                    <p className={kpiValueClassName(item.tone)}>
                      {item.format(summary)}
                    </p>
                  ) : (
                    <Skeleton className="mt-2 h-8 w-28" />
                  )}
                </div>
                <div className="flex size-8 items-center justify-center rounded-lg bg-muted/70">
                  <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                </div>
              </CardHeader>
              <CardContent>
                {item.key === 'complianceScorePercent' && summary && summary.activeAssetCount > 0 ? (
                  <Progress value={summary.complianceScorePercent} />
                ) : null}
                <p className="mt-2 text-xs text-muted-foreground">{item.hint}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
