'use client';

import { useMemo, useState } from 'react';
import type { ResourceStatusCardDto } from '@cloudpulse/api-contracts';
import { Radio } from 'lucide-react';
import { ResourceCard } from '@/components/resource-card';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuditMode } from '@/lib/audit-mode-context';

type ResourceFilter = 'all' | ResourceStatusCardDto['status'];

const FILTERS: { value: ResourceFilter; label: string }[] = [
  { value: 'all', label: 'All findings' },
  { value: 'OVER_PROVISIONED', label: 'Over-provisioned' },
  { value: 'ZOMBIE', label: 'Zombie' },
  { value: 'IDLE', label: 'Idle' },
];

export function ResourceFeed({
  resources,
}: {
  resources: ResourceStatusCardDto[];
}) {
  const { isSimulated } = useAuditMode();
  const [filter, setFilter] = useState<ResourceFilter>('all');

  const visibleResources = useMemo(() => {
    if (filter === 'all') {
      return resources;
    }
    return resources.filter((resource) => resource.status === filter);
  }, [filter, resources]);

  return (
    <section className="space-y-4" aria-label="Audited resource feed">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Audited resources</h2>
          <p className="text-xs text-muted-foreground">
            Waste findings from the CloudPulse auditor engine
          </p>
        </div>
        <Tabs
          value={filter}
          onValueChange={(value) => setFilter(value as ResourceFilter)}
        >
          <TabsList className="h-auto flex-wrap">
            {FILTERS.map((item) => (
              <TabsTrigger key={item.value} value={item.value}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {!isSimulated ? (
        <Card className="border-dashed bg-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Radio className="size-4 text-amber-300" aria-hidden="true" />
              Live AWS connector pending
            </CardTitle>
            <CardDescription>
              Switch back to Simulated Enterprise to inspect the Day 3 mock
              estate, or complete AWS account linking to stream live telemetry.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">
              {visibleResources.length}{' '}
              {visibleResources.length === 1 ? 'resource' : 'resources'}
            </Badge>
            <span>Sorted by identified monthly waste</span>
          </div>
          {visibleResources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      )}
    </section>
  );
}
