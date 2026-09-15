import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { Activity, Cloud, Lock, RefreshCw, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  applyEvaluatorSessionChange,
  useAuditStatus,
  useAuditSummary,
  useEvaluatorSession,
} from '../hooks/use-audit-data';
import { resetDashboardStore } from '../store/dashboard-store';
import { lockEvaluatorSession } from '../utils/unlock-api';
import { UnlockSandboxModal } from './unlock-sandbox-modal';

export function NavHeader() {
  const queryClient = useQueryClient();
  const { data: statusData } = useAuditStatus();
  const { data: evaluatorSession } = useEvaluatorSession();
  const { refetch, isFetching } = useAuditSummary();
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [isReturningToDemo, setIsReturningToDemo] = useState(false);
  const isEvaluator = evaluatorSession?.isEvaluator === true;
  const isSimulated = !isEvaluator && statusData?.mode === 'SIMULATED';
  const isLiveSandbox = isEvaluator || statusData?.mode === 'LIVE';
  const engineStatus = isSimulated
    ? 'Auditor Engine: Connected (Local)'
    : `Auditor Engine: Connected (Live AWS${statusData?.profile ? ` - ${statusData.profile}` : ''})`;

  function handleSessionChange() {
    resetDashboardStore();
    void applyEvaluatorSessionChange(queryClient);
  }

  async function handleReturnToDemo() {
    setIsReturningToDemo(true);
    const result = await lockEvaluatorSession();
    setIsReturningToDemo(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    handleSessionChange();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-start justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
            <Activity className="size-4 text-primary" aria-hidden="true" />
          </div>
          <div>
            <div className="flex h-9 items-center gap-2">
              <h1 className="whitespace-nowrap text-sm font-semibold tracking-tight text-foreground sm:text-base">
                CloudPulse
              </h1>
              <Badge
                variant="outline"
                className="hidden border-sky-500/30 bg-sky-500/10 text-sky-300 sm:inline-flex"
              >
                Enterprise IDP
              </Badge>
              {!isSimulated && (
                <Badge
                  variant="outline"
                  className="hidden border-amber-500/30 bg-amber-500/10 text-amber-500 sm:inline-flex"
                >
                  AWS Read-Only Session
                </Badge>
              )}
            </div>
            <p className="hidden -mt-1.5 text-xs text-muted-foreground sm:block">
              FinOps control plane
            </p>
          </div>
        </div>

        <div className="flex min-h-9 w-max max-w-full shrink-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <Badge
            variant="outline"
            className={cn(
              isLiveSandbox
                ? 'border-amber-500/30 bg-amber-500/10 text-amber-500'
                : 'border-border text-muted-foreground',
            )}
          >
            {isLiveSandbox ? 'Live AWS Sandbox' : 'Simulated Demo'}
          </Badge>
          {!isLiveSandbox && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setUnlockOpen(true)}>
              <Lock className="size-3.5" aria-hidden="true" />
              Unlock Live Sandbox
            </Button>
          )}
          {isEvaluator && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                void handleReturnToDemo();
              }}
              disabled={isReturningToDemo}
              aria-busy={isReturningToDemo}
            >
              <RotateCcw
                className={cn(
                  'size-3.5',
                  isReturningToDemo && 'animate-spin motion-reduce:animate-none',
                )}
                aria-hidden="true"
              />
              Return to Demo
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void refetch();
            }}
            aria-busy={isFetching}
          >
            <RefreshCw
              className={cn('size-3.5', isFetching && 'animate-spin motion-reduce:animate-none')}
              aria-hidden="true"
            />
            Sync Telemetry
          </Button>
          <p className="flex min-w-0 max-w-full items-center gap-2">
            <span
              className={cn(
                'size-2 shrink-0 rounded-full',
                isSimulated || statusData?.profile
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                  : 'bg-amber-400',
              )}
              aria-hidden="true"
            />
            <Cloud className="size-3.5 shrink-0" aria-hidden="true" />
            <span
              className="min-w-0 text-pretty"
              role="status"
              aria-live="polite"
              aria-label={engineStatus}
            >
              {engineStatus}
            </span>
          </p>
        </div>
      </div>
      <Separator />
      <UnlockSandboxModal
        open={unlockOpen}
        onClose={() => setUnlockOpen(false)}
        onUnlocked={() => {
          setUnlockOpen(false);
          handleSessionChange();
        }}
      />
    </header>
  );
}
