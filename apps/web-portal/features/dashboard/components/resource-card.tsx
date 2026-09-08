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
import { cn } from '@/lib/utils';
import { useRemediateResource } from '../hooks/use-audit-data';
import { useDashboardStore } from '../store/dashboard-store';
import { formatUsd } from '../utils/format';

type SeverityStyle = {
  badge: string;
  bar: string;
  label: string;
};

const SEVERITY_STYLES: Record<ResourceStatusCardDto['status'], SeverityStyle> = {
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
  const triggerAdvisorPrompt = useDashboardStore(
    (state) => state.triggerAdvisorPrompt,
  );
  const reviewingRemediations = useDashboardStore(
    (state) => state.reviewingRemediations,
  );
  const setReviewingRemediation = useDashboardStore(
    (state) => state.setReviewingRemediation,
  );
  const severity = SEVERITY_STYLES[resource.status];
  const isQueued = queuedRemediations.includes(resource.id);
  const isReviewing = reviewingRemediations.includes(resource.id);
  const isMutating =
    remediate.isPending &&
    remediate.variables?.resourceId === resource.id;

  async function handleRemediate() {
    setReviewingRemediation(resource.id);
    triggerAdvisorPrompt(`Request PR proposal for ${resource.resourceName}`, resource);
  }

  return (
    <Card className={cn("relative overflow-hidden bg-card/80", isReviewing && "border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]")}>
      <span
        className={cn('absolute inset-y-0 left-0 w-1', severity.bar)}
        aria-hidden="true"
      />
      <CardHeader className="pl-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate font-semibold">
              <h3 className="truncate font-semibold">{resource.resourceName}</h3>
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
          <Badge
            role="status"
            aria-live="polite"
            aria-label="Queued"
            className="border-emerald-400/30 bg-emerald-500/15 text-emerald-300"
          >
            ✓ PR Drafted
          </Badge>
        ) : isReviewing ? (
          <Badge
            role="status"
            aria-live="polite"
            className="border-blue-400/30 bg-blue-500/15 text-blue-300 animate-pulse"
          >
            Reviewing in Advisor
          </Badge>
        ) : (
          <Button
            size="sm"
            onClick={() => {
              void handleRemediate();
            }}
            disabled={isQueued || isMutating || isReviewing}
          >
            {isMutating ? (
              <Loader2
                className="size-3.5 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : null}
            {resource.recommendedAction.label}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
