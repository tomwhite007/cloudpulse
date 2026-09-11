import type { ResourceStatusCardDto } from '@cloudpulse/api-contracts';

export type AuditMode = 'SIMULATED' | 'LIVE';
export type ResourceTypeFilter = 'ALL' | ResourceStatusCardDto['resourceType'];
export type StatusFilter = 'all' | ResourceStatusCardDto['status'];

export const AUDIT_MODE_OPTIONS: readonly { id: AuditMode; label: string }[] = [
  { id: 'SIMULATED', label: 'Simulated Enterprise' },
  { id: 'LIVE', label: 'Live AWS' },
];

export const RESOURCE_TYPE_FILTER_OPTIONS: readonly {
  value: ResourceTypeFilter;
  label: string;
}[] = [
  { value: 'ALL', label: 'All types' },
  { value: 'RDS', label: 'RDS' },
  { value: 'EBS', label: 'EBS' },
  { value: 'ECS', label: 'ECS' },
  { value: 'EC2', label: 'EC2' },
  { value: 'LAMBDA', label: 'Lambda' },
  { value: 'ELASTIC_IP', label: 'Elastic IP' },
];

export const STATUS_FILTER_OPTIONS: readonly {
  value: StatusFilter;
  label: string;
}[] = [
  { value: 'all', label: 'All findings' },
  { value: 'OVER_PROVISIONED', label: 'Over-provisioned' },
  { value: 'ZOMBIE', label: 'Zombie' },
  { value: 'IDLE', label: 'Idle' },
];

export const RESOURCE_TYPE_FILTERS: readonly ResourceTypeFilter[] =
  RESOURCE_TYPE_FILTER_OPTIONS.map((item) => item.value);

export const STATUS_FILTERS: readonly StatusFilter[] = [
  ...STATUS_FILTER_OPTIONS.map((item) => item.value),
  'HEALTHY',
];

export function isResourceTypeFilter(value: string): value is ResourceTypeFilter {
  return (RESOURCE_TYPE_FILTERS as readonly string[]).includes(value);
}

export function isStatusFilter(value: string): value is StatusFilter {
  return (STATUS_FILTERS as readonly string[]).includes(value);
}

export function filterResources(
  resources: ResourceStatusCardDto[],
  filters: {
    resourceType: ResourceTypeFilter;
    status: StatusFilter;
  },
): ResourceStatusCardDto[] {
  return resources.filter((resource) => {
    const matchesType =
      filters.resourceType === 'ALL' || resource.resourceType === filters.resourceType;
    const matchesStatus = filters.status === 'all' || resource.status === filters.status;
    return matchesType && matchesStatus;
  });
}
