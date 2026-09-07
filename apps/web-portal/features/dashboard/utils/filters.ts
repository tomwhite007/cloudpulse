import type { ResourceStatusCardDto } from '@cloudpulse/api-contracts';

export type AuditMode = 'SIMULATED' | 'LIVE';
export type ResourceTypeFilter = 'ALL' | ResourceStatusCardDto['resourceType'];
export type StatusFilter = 'all' | ResourceStatusCardDto['status'];

export const RESOURCE_TYPE_FILTERS: readonly ResourceTypeFilter[] = [
  'ALL',
  'RDS',
  'EBS',
  'ECS',
  'EC2',
  'LAMBDA',
];

export const STATUS_FILTERS: readonly StatusFilter[] = [
  'all',
  'OVER_PROVISIONED',
  'ZOMBIE',
  'IDLE',
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
      filters.resourceType === 'ALL' ||
      resource.resourceType === filters.resourceType;
    const matchesStatus =
      filters.status === 'all' || resource.status === filters.status;
    return matchesType && matchesStatus;
  });
}
