'use client';

import { Activity, Cloud } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useAuditMode, type AuditMode } from '@/lib/audit-mode-context';

const modes: { id: AuditMode; label: string }[] = [
  { id: 'simulated', label: 'Simulated Enterprise' },
  { id: 'live', label: 'Live AWS' },
];

export function NavHeader() {
  const { mode, setMode, isSimulated } = useAuditMode();

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="mx-auto grid min-h-16 max-w-[1600px] grid-cols-1 items-center gap-3 px-4 py-3 md:grid-cols-[1fr_auto_1fr] sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
            <Activity className="size-4 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold tracking-tight text-foreground sm:text-base">
                CloudPulse
              </p>
              <Badge
                variant="outline"
                className="hidden border-sky-500/30 bg-sky-500/10 text-sky-300 sm:inline-flex"
              >
                Enterprise IDP
              </Badge>
            </div>
            <p className="hidden text-xs text-muted-foreground sm:block">
              FinOps control plane
            </p>
          </div>
        </div>

        <div
          className="inline-flex justify-self-start rounded-lg border border-border bg-muted/40 p-1 md:justify-self-center"
          role="group"
          aria-label="Audit data source"
        >
          {modes.map((option) => {
            const active = mode === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setMode(option.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors sm:px-3 sm:text-sm',
                  active
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                aria-pressed={active}
              >
                <span
                  className={cn(
                    'size-2 rounded-full',
                    active ? 'bg-emerald-400' : 'border border-muted-foreground/70',
                  )}
                  aria-hidden="true"
                />
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="flex min-w-0 items-center gap-2 justify-self-start text-xs text-muted-foreground md:justify-self-end">
          <span
            className={cn(
              'size-2 shrink-0 rounded-full',
              isSimulated
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                : 'bg-amber-400',
            )}
            aria-hidden="true"
          />
          <Cloud className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {isSimulated
              ? 'Auditor Engine: Connected (Local)'
              : 'Auditor Engine: Awaiting AWS credentials'}
          </span>
        </div>
      </div>
      <Separator />
    </header>
  );
}
