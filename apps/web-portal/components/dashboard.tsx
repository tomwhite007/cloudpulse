'use client';

import { CopilotPlaceholder } from '@/components/copilot-placeholder';
import { KpiGrid } from '@/components/kpi-grid';
import { NavHeader } from '@/components/nav-header';
import { ResourceFeed } from '@/components/resource-feed';
import { Toaster } from '@/components/ui/sonner';
import { useAuditSummary } from '@/hooks/use-audit-data';

export function Dashboard() {
  const { data: summary } = useAuditSummary();
  const resources = [...(summary?.resources ?? [])].sort(
    (left, right) => right.potentialMonthlySavings - left.potentialMonthlySavings,
  );

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 py-6 lg:flex-row lg:items-start sm:px-6">
        <main className="min-w-0 space-y-6 lg:w-2/3">
          <KpiGrid summary={summary} />
          <ResourceFeed resources={resources} />
        </main>
        <div className="lg:sticky lg:top-20 lg:w-1/3">
          <CopilotPlaceholder />
        </div>
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
}
