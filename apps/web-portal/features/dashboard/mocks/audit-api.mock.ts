import type {
  RemediationRequestDto,
  RemediationResponseDto,
  ResourceStatusCardDto,
} from '@cloudpulse/api-contracts';
import { MOCK_AUDIT_RESOURCES } from '@cloudpulse/api-contracts/mocks';

export const MOCK_SIMULATED_AUDIT_STATUS = {
  mode: 'SIMULATED',
  status: 'ok',
} as const;

export interface MockRemediationDeps {
  resources?: ResourceStatusCardDto[];
  nowIso?: string;
}

export function createMockRemediationResponse(
  request: RemediationRequestDto,
  deps: MockRemediationDeps = {},
): RemediationResponseDto {
  const resources = deps.resources ?? MOCK_AUDIT_RESOURCES;
  const queuedAt = deps.nowIso ?? new Date().toISOString();
  const resource = resources.find((item) => item.id === request.resourceId);
  const actionMatches = resource?.recommendedAction.actionId === request.actionId;

  if (!resource || !actionMatches) {
    return {
      success: false,
      resourceId: request.resourceId,
      message: `No matching 1-click remediation found for resource ${request.resourceId}.`,
      queuedAt,
    };
  }

  return {
    success: true,
    resourceId: request.resourceId,
    message: `Queued ${resource.recommendedAction.label} for ${resource.resourceName}. Terraform patch will apply in the next plan.`,
    queuedAt,
  };
}
