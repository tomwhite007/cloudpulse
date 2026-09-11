'use client';

import type { CostAuditSummaryDto } from '@cloudpulse/api-contracts';
import { DollarSign, Leaf, Server, ShieldCheck, type LucideIcon } from 'lucide-react';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { formatInteger, formatUsd } from '../utils/format';
import type { KpiItem, KpiMetricKey, KpiTone } from './kpi-grid.types';

function formatCompliancePercent(summary: CostAuditSummaryDto) {
  if (summary.activeAssetCount === 0) return 'N/A';
  return `${summary.complianceScorePercent}%`;
}

function kpiValueClassName(tone: KpiTone | undefined) {
  if (tone === 'warning') {
    return 'text-2xl font-semibold tracking-tight text-amber-300';
  }
  if (tone === 'success') {
    return 'text-2xl font-semibold tracking-tight text-emerald-300';
  }
  return 'text-2xl font-semibold tracking-tight text-foreground';
}

const KPI_ITEMS: readonly KpiItem[] = [
  {
    key: 'totalMonthlySpend',
    label: 'Total Monthly Spend',
    format: (summary) => formatUsd(summary.totalMonthlySpend),
    hint: (summary) => {
      if (summary.totalMonthlySpend === 0 && summary.totalIdentifiedWaste > 0) {
        return (
          <span
            title="New or low-spend account; waste is projected run-rate"
            className="cursor-help border-b border-dashed border-muted-foreground/50"
          >
            Trailing 30d invoice ($0.00 recorded)
          </span>
        );
      }
      return 'Trailing 30-day cloud invoice';
    },
  },
  {
    key: 'totalIdentifiedWaste',
    label: 'Identified Monthly Waste',
    format: (summary) => formatUsd(summary.totalIdentifiedWaste),
    hint: 'Recoverable monthly run-rate',
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
    hint: (summary) => {
      if (summary.complianceScorePercent === 0 && summary.activeAssetCount > 0) {
        return (
          <span className="font-medium text-rose-400">
            Critical: 100% of monitored assets flagged
          </span>
        );
      }
      return 'Policy adherence across estates';
    },
    tone: 'success',
  },
];

const KPI_ICONS: Record<KpiMetricKey, LucideIcon> = {
  totalMonthlySpend: DollarSign,
  totalIdentifiedWaste: Leaf,
  activeAssetCount: Server,
  complianceScorePercent: ShieldCheck,
};

export function KpiGrid({ summary }: { summary: CostAuditSummaryDto | undefined }) {
  return (
    <section aria-label="FinOps KPI metrics">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_ITEMS.map((item) => {
          const Icon = KPI_ICONS[item.key];
          return (
            <Card key={item.key} className="h-full gap-2 bg-card/80">
              <CardHeader className="gap-1">
                <CardTitle className="line-clamp-2 min-h-9 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {item.label}
                </CardTitle>
                {summary ? (
                  <p className={kpiValueClassName(item.tone)}>{item.format(summary)}</p>
                ) : (
                  <Skeleton className="h-8 w-28" />
                )}
                <CardAction>
                  <div className="flex size-8 items-center justify-center rounded-lg bg-muted/70">
                    <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                  </div>
                </CardAction>
              </CardHeader>
              <CardContent className="mt-auto">
                <div className="min-h-1.5">
                  {item.key === 'complianceScorePercent' &&
                  summary &&
                  summary.activeAssetCount > 0 ? (
                    <Progress
                      value={summary.complianceScorePercent}
                      trackClassName={
                        summary.complianceScorePercent === 0 ? 'bg-rose-500/20' : undefined
                      }
                      indicatorClassName={
                        summary.complianceScorePercent === 0 ? 'bg-rose-500' : undefined
                      }
                    />
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {typeof item.hint === 'function'
                    ? summary
                      ? item.hint(summary)
                      : ''
                    : item.hint}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
