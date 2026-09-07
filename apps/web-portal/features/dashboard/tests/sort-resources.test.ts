import type { ResourceStatusCardDto } from '@cloudpulse/api-contracts';
import { describe, expect, it } from 'vitest';
import { sortResourcesBySavings } from '../utils/sort-resources';

function resource(
  id: string,
  potentialMonthlySavings: number,
): ResourceStatusCardDto {
  return {
    id,
    resourceName: id,
    resourceType: 'EC2',
    status: 'IDLE',
    region: 'us-east-1',
    monthlyCost: potentialMonthlySavings,
    potentialMonthlySavings,
    telemetrySummary: 't',
    recommendedAction: {
      actionId: `act-${id}`,
      label: 'Resize',
      actionType: 'RESIZE',
      terraformPatchPreview: 'preview',
    },
  };
}

describe('sortResourcesBySavings', () => {
  it('returns a new array sorted by potential savings descending', () => {
    const input = [resource('low', 10), resource('high', 90), resource('mid', 40)];
    const sorted = sortResourcesBySavings(input);

    expect(sorted.map((item) => item.id)).toEqual(['high', 'mid', 'low']);
    expect(input.map((item) => item.id)).toEqual(['low', 'high', 'mid']);
  });

  it('returns a copy of an empty list', () => {
    const input: ResourceStatusCardDto[] = [];
    const sorted = sortResourcesBySavings(input);
    expect(sorted).toEqual([]);
    expect(sorted).not.toBe(input);
  });
});
