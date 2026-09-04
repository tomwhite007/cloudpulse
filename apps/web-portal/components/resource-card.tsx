'use client';

import { useState } from 'react';
import type {
  RemediationResponseDto,
  ResourceStatusCardDto,
} from '@cloudpulse/api-contracts';
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
import { formatUsd } from '@/lib/format';
import { cn } from '@/lib/utils';

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

type RemediationState = 'idle' | 'loading' | 'queued' | 'error';

async function queueRemediation(
  resource: ResourceStatusCardDto,
): Promise<RemediationResponseDto> {
  await new Promise((resolve) => setTimeout(resolve, 700));
  return {
    success: true,
    resourceId: resource.id,
    message: `Queued ${resource.recommendedAction.label} for ${resource.resourceName}. Terraform patch will apply in the next plan.`,
    queuedAt: new Date().toISOString(),
  };
}

export function ResourceCard({ resource }: { resource: ResourceStatusCardDto }) {
  const [state, setState] = useState<RemediationState>('idle');
  const severity = SEVERITY_STYLES[resource.status];

  async function handleRemediate() {
    setState('loading');
    const toastId = toast.loading(`Queuing ${resource.recommendedAction.label}…`);
    try {
      const response = await queueRemediation(resource);
      if (!response.success) {
        setState('error');
        toast.error(response.message, { id: toastId });
        return;
      }
      setState('queued');
      toast.success(response.message, { id: toastId });
    } catch {
      setState('error');
      toast.error('Unable to queue remediation. Retry in a moment.', { id: toastId });
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
        {state === 'queued' ? (
          <Badge className="border-emerald-400/30 bg-emerald-500/15 text-emerald-300">
            Queued
          </Badge>
        ) : (
          <Button
            size="sm"
            onClick={handleRemediate}
            disabled={state === 'loading'}
          >
            {state === 'loading' ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : null}
            {resource.recommendedAction.label}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
