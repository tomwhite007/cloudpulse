'use client';

import { Toaster } from '@/components/ui/sonner';
import { useAuditSummary, useEvaluatorSession } from '../hooks/use-audit-data';
import { PulseAdvisor } from '../../../components/pulse-advisor/pulse-advisor';
import { AuditLoadError } from './audit-load-error';
import { KpiGrid } from './kpi-grid';
import { NavHeader } from './nav-header';
import { ResourceFeed } from './resource-feed';

export function Dashboard() {
  const { data: summary, error, isError, refetch } = useAuditSummary();
  const { data: evaluatorSession } = useEvaluatorSession();
  const resources = [...(summary?.resources ?? [])].sort(
    (left, right) => right.potentialMonthlySavings - left.potentialMonthlySavings,
  );
  const advisorSessionKey = evaluatorSession?.isEvaluator === true ? 'live' : 'demo';

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main"
        className="absolute left-4 top-4 z-50 -translate-y-[200%] rounded-md bg-background px-3 py-2 text-sm font-medium text-foreground ring-2 ring-ring ring-offset-2 ring-offset-background focus:translate-y-0"
      >
        Skip to main content
      </a>
      <NavHeader />
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 py-6 lg:flex-row lg:items-start sm:px-6">
        {isError ? (
          <main id="main" className="min-w-0 lg:w-full">
            <AuditLoadError
              error={error}
              onRetry={() => {
                void refetch();
              }}
            />
          </main>
        ) : (
          <>
            <main id="main" className="min-w-0 space-y-6 lg:w-2/3">
              <KpiGrid summary={summary} />
              <ResourceFeed resources={resources} />
            </main>
            <div className="lg:sticky lg:top-20 lg:w-1/3">
              <PulseAdvisor key={advisorSessionKey} />
            </div>
          </>
        )}
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
}
