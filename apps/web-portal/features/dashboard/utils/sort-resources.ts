import type { ResourceStatusCardDto } from '@cloudpulse/api-contracts';

export function sortResourcesBySavings(
  resources: ResourceStatusCardDto[],
): ResourceStatusCardDto[] {
  return [...resources].sort(
    (left, right) =>
      right.potentialMonthlySavings - left.potentialMonthlySavings,
  );
}
