'use client';

import type { ResourceStatusCardDto } from '@cloudpulse/api-contracts';
import { Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useRemediateResource } from '@/hooks/use-audit-data';
import { formatUsd } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useDashboardStore } from '@/store/dashboard-store';

const SEVERITY_STYLES: Record<
  ResourceStatusCardDto['status'],
  { badge: string; bar: string; label: string }
> = {
  OVER_PROVISIONED: {
    badge: 'border-amber-400/40 bg-amber-500/15 text-amber-300',
    bar: 'bg-amber-400',
    label: 'Warning',
  },
  ZOMBIE: {
    badge: 'border-rose-400/40 bg-rose-500/15 text-rose-300',
    bar: 'bg-rose-400',
    label: 'Critical',
  },
  IDLE: {
    badge: 'border-sky-400/40 bg-sky-500/15 text-sky-300',
    bar: 'bg-sky-300',
    label: 'Info',
  },
  HEALTHY: {
    badge: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300',
    bar: 'bg-emerald-400',
    label: 'Healthy',
  },
};

export function ResourceCard({ resource }: { resource: ResourceStatusCardDto }) {
  const remediate = useRemediateResource();
  const queuedRemediations = useDashboardStore(
    (state) => state.queuedRemediations,
  );
  const queueRemediation = useDashboardStore((state) => state.queueRemediation);
  const removeQueuedRemediation = useDashboardStore(
    (state) => state.removeQueuedRemediation,
  );
  const severity = SEVERITY_STYLES[resource.status];
  const isQueued = queuedRemediations.includes(resource.id);
  const isMutating =
    remediate.isPending &&
    remediate.variables?.resourceId === resource.id;

  async function handleRemediate() {
    queueRemediation(resource.id);
    const toastId = toast.loading(
      `Queuing ${resource.recommendedAction.label}…`,
    );
    try {
      const response = await remediate.mutateAsync({
        resourceId: resource.id,
        actionId: resource.recommendedAction.actionId,
      });
      if (!response.success) {
        removeQueuedRemediation(resource.id);
        toast.error(response.message, { id: toastId });
        return;
      }
      toast.success(response.message, { id: toastId });
    } catch {
      removeQueuedRemediation(resource.id);
      toast.error('Unable to queue remediation. Retry in a moment.', {
        id: toastId,
      });
    }
  }

  return (
    <Card className="relative overflow-hidden bg-card/80">
      <span
        className={cn('absolute inset-y-0 left-0 w-1', severity.bar)}
        aria-hidden="true"
      />
      <CardHeader className="pl-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate font-semibold">
              {resource.resourceName}
            </CardTitle>
            <CardDescription className="mt-1 flex flex-wrap items-center gap-2">
              <span>{resource.resourceType}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" aria-hidden="true" />
                {resource.region}
              </span>
            </CardDescription>
          </div>
          <Badge variant="outline" className={severity.badge}>
            {resource.status.replaceAll('_', ' ')} · {severity.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pl-5">
        <p className="text-sm text-muted-foreground">{resource.telemetrySummary}</p>
        <div className="flex flex-wrap gap-4 text-xs">
          <p>
            <span className="text-muted-foreground">Monthly cost </span>
            <span className="font-medium text-foreground">
              {formatUsd(resource.monthlyCost)}
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">Potential savings </span>
            <span className="font-medium text-emerald-300">
              {formatUsd(resource.potentialMonthlySavings)}
            </span>
          </p>
        </div>
      </CardContent>
      <CardFooter className="justify-between gap-3 pl-5">
        <p className="text-xs text-muted-foreground">
          1-click remediation · {resource.recommendedAction.actionType}
        </p>
        {isQueued && !isMutating ? (
          <Badge className="border-emerald-400/30 bg-emerald-500/15 text-emerald-300">
            Queued
          </Badge>
        ) : (
          <Button
            size="sm"
            onClick={() => {
              void handleRemediate();
            }}
            disabled={isQueued || isMutating}
          >
            {isMutating ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : null}
            {resource.recommendedAction.label}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
