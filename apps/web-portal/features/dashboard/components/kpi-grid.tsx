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
import { useDashboardStore } from '../store/dashboard-store';
import { KPI_ITEMS, kpiValueClassName } from '../utils/kpi-items';
import type { KpiMetricKey } from './kpi-grid.types';

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
  const mode = useDashboardStore((state) => state.mode);
  const isSimulated = mode === 'SIMULATED';

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
                  {isSimulated && summary ? (
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
