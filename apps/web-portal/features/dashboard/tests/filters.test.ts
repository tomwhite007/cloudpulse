import type { ResourceStatusCardDto } from '@cloudpulse/api-contracts';
import { describe, expect, it } from 'vitest';
import {
  AUDIT_MODE_OPTIONS,
  filterResources,
  isResourceTypeFilter,
  isStatusFilter,
  RESOURCE_TYPE_FILTER_OPTIONS,
  STATUS_FILTER_OPTIONS,
} from '../utils/filters';

function resource(
  id: string,
  resourceType: ResourceStatusCardDto['resourceType'],
  status: ResourceStatusCardDto['status'],
): ResourceStatusCardDto {
  return {
    id,
    resourceName: id,
    resourceType,
    status,
    region: 'us-east-1',
    monthlyCost: 1,
    potentialMonthlySavings: 1,
    telemetrySummary: 't',
    recommendedAction: {
      actionId: `act-${id}`,
      label: 'Resize',
      actionType: 'RESIZE',
      terraformPatchPreview: 'preview',
    },
  };
}

const inventory = [
  resource('rds-over', 'RDS', 'OVER_PROVISIONED'),
  resource('ebs-zombie', 'EBS', 'ZOMBIE'),
  resource('ecs-idle', 'ECS', 'IDLE'),
  resource('ec2-healthy', 'EC2', 'HEALTHY'),
];

describe('isResourceTypeFilter', () => {
  it('accepts known type filters', () => {
    expect(isResourceTypeFilter('ALL')).toBe(true);
    expect(isResourceTypeFilter('LAMBDA')).toBe(true);
  });

  it('rejects unknown values', () => {
    expect(isResourceTypeFilter('S3')).toBe(false);
    expect(isResourceTypeFilter('')).toBe(false);
  });
});

describe('isStatusFilter', () => {
  it('accepts known status filters', () => {
    expect(isStatusFilter('all')).toBe(true);
    expect(isStatusFilter('HEALTHY')).toBe(true);
  });

  it('rejects unknown values', () => {
    expect(isStatusFilter('WASTED')).toBe(false);
    expect(isStatusFilter('ALL')).toBe(false);
  });
});

describe('filterResources', () => {
  it('returns every resource when both filters are open', () => {
    expect(filterResources(inventory, { resourceType: 'ALL', status: 'all' })).toHaveLength(4);
  });

  it('filters by resource type', () => {
    expect(
      filterResources(inventory, { resourceType: 'RDS', status: 'all' }).map((item) => item.id),
    ).toEqual(['rds-over']);
  });

  it('filters by status', () => {
    expect(
      filterResources(inventory, { resourceType: 'ALL', status: 'ZOMBIE' }).map((item) => item.id),
    ).toEqual(['ebs-zombie']);
  });

  it('applies type and status together', () => {
    expect(
      filterResources(inventory, {
        resourceType: 'ECS',
        status: 'IDLE',
      }).map((item) => item.id),
    ).toEqual(['ecs-idle']);
  });

  it('returns an empty list when nothing matches', () => {
    expect(
      filterResources(inventory, {
        resourceType: 'LAMBDA',
        status: 'HEALTHY',
      }),
    ).toEqual([]);
  });
});

describe('filter option catalogues', () => {
  it('lists both audit modes', () => {
    expect(AUDIT_MODE_OPTIONS.map((item) => item.id)).toEqual(['SIMULATED', 'LIVE']);
  });

  it('lists resource type tabs including ALL', () => {
    expect(RESOURCE_TYPE_FILTER_OPTIONS.map((item) => item.value)).toEqual([
      'ALL',
      'RDS',
      'EBS',
      'ECS',
      'EC2',
      'LAMBDA',
      'ELASTIC_IP',
    ]);
  });

  it('lists status tabs without HEALTHY, which remains a type-guard value', () => {
    expect(STATUS_FILTER_OPTIONS.map((item) => item.value)).toEqual([
      'all',
      'OVER_PROVISIONED',
      'ZOMBIE',
      'IDLE',
    ]);
    expect(isStatusFilter('HEALTHY')).toBe(true);
  });
});
