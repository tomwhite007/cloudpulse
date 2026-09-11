import type { ResourceStatusCardDto } from '@cloudpulse/api-contracts';
import { MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
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
  const queuedRemediations = useDashboardStore((state) => state.queuedRemediations);
  const queuedRemediationPrs = useDashboardStore((state) => state.queuedRemediationPrs);
  const triggerAdvisorPrompt = useDashboardStore((state) => state.triggerAdvisorPrompt);
  const reviewingRemediations = useDashboardStore((state) => state.reviewingRemediations);
  const setReviewingRemediation = useDashboardStore((state) => state.setReviewingRemediation);
  const severity = SEVERITY_STYLES[resource.status];
  const isQueued = queuedRemediations.includes(resource.id);
  const queuedPr = queuedRemediationPrs[resource.id];
  const isReviewing = reviewingRemediations.includes(resource.id);

  function handleRemediate() {
    setReviewingRemediation(resource.id);
    triggerAdvisorPrompt(`Request PR proposal for ${resource.resourceName}`, resource);
  }

  return (
    <Card
      aria-current={isReviewing ? true : undefined}
      className={cn(
        'relative overflow-hidden bg-card/80',
        isReviewing && 'ring-inset ring-2 ring-blue-400 bg-blue-500/10',
      )}
    >
      <span className={cn('absolute inset-y-0 left-0 w-1', severity.bar)} aria-hidden="true" />
      <CardHeader className="pl-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
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
          <Badge variant="outline" className={cn('self-start', severity.badge)}>
            {resource.status.replaceAll('_', ' ')} · {severity.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pl-5">
        <p className="text-sm text-muted-foreground">{resource.telemetrySummary}</p>
        <div className="flex flex-wrap gap-4 text-xs">
          <p>
            <span className="text-muted-foreground">Monthly cost </span>
            <span className="font-medium text-foreground">{formatUsd(resource.monthlyCost)}</span>
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
        {isQueued && queuedPr ? (
          <a
            href={queuedPr.prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <span aria-hidden="true">✓ </span>
            PR #{queuedPr.prNumber} Open
          </a>
        ) : isReviewing ? (
          <Badge
            role="status"
            aria-live="polite"
            className="border-blue-400/30 bg-blue-500/15 text-blue-300 animate-pulse motion-reduce:animate-none"
          >
            Reviewing in Advisor
          </Badge>
        ) : (
          <Button
            size="sm"
            onClick={() => {
              handleRemediate();
            }}
            disabled={isQueued || isReviewing}
          >
            {resource.recommendedAction.label}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
