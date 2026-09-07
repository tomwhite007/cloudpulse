'use client';

import { useMemo } from 'react';
import type { ResourceStatusCardDto } from '@cloudpulse/api-contracts';
import { Radio } from 'lucide-react';
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
import { useDashboardStore } from '../store/dashboard-store';
import {
  filterResources,
  RESOURCE_TYPE_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
} from '../utils/filters';
import { ResourceCard } from './resource-card';

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
  const statusFilter = useDashboardStore((state) => state.statusFilter);
  const setStatusFilter = useDashboardStore((state) => state.setStatusFilter);
  const isSimulated = mode === 'SIMULATED';

  const visibleResources = useMemo(
    () =>
      filterResources(resources, {
        resourceType: selectedResourceType,
        status: statusFilter,
      }),
    [resources, selectedResourceType, statusFilter],
  );

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
          onValueChange={(value) => setStatusFilter(String(value))}
        >
          <TabsList className="h-auto flex-wrap" aria-label="Filter by status">
            {STATUS_FILTER_OPTIONS.map((item) => (
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
        <TabsList
          variant="line"
          className="h-auto flex-wrap"
          aria-label="Filter by resource type"
        >
          {RESOURCE_TYPE_FILTER_OPTIONS.map((item) => (
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
              <h3 className="text-sm font-medium">Live AWS connector pending</h3>
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
            <p
              role="status"
              aria-live="polite"
              aria-label="No resources match the current filters."
              className="text-sm text-muted-foreground"
            >
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
