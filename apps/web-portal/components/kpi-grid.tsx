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
import { formatInteger, formatUsd } from '@/lib/format';
import { useDashboardStore } from '@/store/dashboard-store';

interface KpiItem {
  key: keyof Pick<
    CostAuditSummaryDto,
    | 'totalMonthlySpend'
    | 'totalIdentifiedWaste'
    | 'activeAssetCount'
    | 'complianceScorePercent'
  >;
  label: string;
  icon: LucideIcon;
  format: (summary: CostAuditSummaryDto) => string;
  hint: string;
  tone?: 'default' | 'warning' | 'success';
}

const KPI_ITEMS: KpiItem[] = [
  {
    key: 'totalMonthlySpend',
    label: 'Total Monthly Spend',
    icon: DollarSign,
    format: (summary) => formatUsd(summary.totalMonthlySpend),
    hint: 'Trailing 30-day cloud invoice',
  },
  {
    key: 'totalIdentifiedWaste',
    label: 'Identified Monthly Waste',
    icon: Leaf,
    format: (summary) => formatUsd(summary.totalIdentifiedWaste),
    hint: 'Recoverable run-rate from findings',
    tone: 'warning',
  },
  {
    key: 'activeAssetCount',
    label: 'Monitored Cloud Assets',
    icon: Server,
    format: (summary) => formatInteger(summary.activeAssetCount),
    hint: 'Resources under continuous audit',
  },
  {
    key: 'complianceScorePercent',
    label: 'FinOps Compliance Score',
    icon: ShieldCheck,
    format: (summary) => `${summary.complianceScorePercent}%`,
    hint: 'Policy adherence across estates',
    tone: 'success',
  },
];

export function KpiGrid({
  summary,
}: {
  summary: CostAuditSummaryDto | undefined;
}) {
  const mode = useDashboardStore((state) => state.mode);
  const isSimulated = mode === 'SIMULATED';

  return (
    <section aria-label="FinOps KPI metrics">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.key} className="bg-card/80">
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {item.label}
                  </CardTitle>
                  {isSimulated && summary ? (
                    <p
                      className={
                        item.tone === 'warning'
                          ? 'mt-2 text-2xl font-semibold tracking-tight text-amber-300'
                          : item.tone === 'success'
                            ? 'mt-2 text-2xl font-semibold tracking-tight text-emerald-300'
                            : 'mt-2 text-2xl font-semibold tracking-tight text-foreground'
                      }
                    >
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
                {item.key === 'complianceScorePercent' && isSimulated && summary ? (
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
