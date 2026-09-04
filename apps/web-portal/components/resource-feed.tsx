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
import {
  useDashboardStore,
  type ResourceTypeFilter,
} from '@/store/dashboard-store';

type StatusFilter = 'all' | ResourceStatusCardDto['status'];

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All findings' },
  { value: 'OVER_PROVISIONED', label: 'Over-provisioned' },
  { value: 'ZOMBIE', label: 'Zombie' },
  { value: 'IDLE', label: 'Idle' },
];

const RESOURCE_TYPE_FILTERS: { value: ResourceTypeFilter; label: string }[] = [
  { value: 'ALL', label: 'All types' },
  { value: 'RDS', label: 'RDS' },
  { value: 'EBS', label: 'EBS' },
  { value: 'ECS', label: 'ECS' },
  { value: 'EC2', label: 'EC2' },
  { value: 'LAMBDA', label: 'Lambda' },
];

export function ResourceFeed({
  resources,
}: {
  resources: ResourceStatusCardDto[];
}) {
  const mode = useDashboardStore((state) => state.mode);
  const selectedResourceType = useDashboardStore(
    (state) => state.selectedResourceType,
  );
  const setSelectedResourceType = useDashboardStore(
    (state) => state.setSelectedResourceType,
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const isSimulated = mode === 'SIMULATED';

  const visibleResources = useMemo(() => {
    return resources.filter((resource) => {
      const matchesType =
        selectedResourceType === 'ALL' ||
        resource.resourceType === selectedResourceType;
      const matchesStatus =
        statusFilter === 'all' || resource.status === statusFilter;
      return matchesType && matchesStatus;
    });
  }, [resources, selectedResourceType, statusFilter]);

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
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as StatusFilter)}
        >
          <TabsList className="h-auto flex-wrap">
            {STATUS_FILTERS.map((item) => (
              <TabsTrigger key={item.value} value={item.value}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

        <Tabs
          value={selectedResourceType}
          onValueChange={(value) => setSelectedResourceType(String(value))}
        >
        <TabsList variant="line" className="h-auto flex-wrap">
          {RESOURCE_TYPE_FILTERS.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

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
          {visibleResources.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No resources match the current filters.
            </p>
          ) : (
            visibleResources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))
          )}
        </div>
      )}
    </section>
  );
}
