'use client';

import {
  MOCK_AUDIT_RESOURCES,
  MOCK_COST_AUDIT_SUMMARY,
  CostAuditSummarySchema,
  RemediationResponseSchema,
  type CostAuditSummaryDto,
  type RemediationRequestDto,
  type RemediationResponseDto,
} from '@cloudpulse/api-contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDashboardStore, type AuditMode } from '@/store/dashboard-store';

const AUDITOR_API_BASE =
  process.env.NEXT_PUBLIC_AUDITOR_API_URL ?? 'http://localhost:3000';
const AUDIT_SUMMARY_URL = `${AUDITOR_API_BASE}/api/audit/summary`;
const REMEDIATE_URL = `${AUDITOR_API_BASE}/api/audit/remediate`;
const REQUEST_TIMEOUT_MS = 4000;

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

function simulatedRemediation(
  request: RemediationRequestDto,
): RemediationResponseDto {
  const resource = MOCK_AUDIT_RESOURCES.find(
    (item) => item.id === request.resourceId,
  );
  const actionMatches = resource?.recommendedAction.actionId === request.actionId;

  if (!resource || !actionMatches) {
    return {
      success: false,
      resourceId: request.resourceId,
      message: `No matching 1-click remediation found for resource ${request.resourceId}.`,
      queuedAt: new Date().toISOString(),
    };
  }

  return {
    success: true,
    resourceId: request.resourceId,
    message: `Queued ${resource.recommendedAction.label} for ${resource.resourceName}. Terraform patch will apply in the next plan.`,
    queuedAt: new Date().toISOString(),
  };
}

async function fetchAuditSummary(mode: AuditMode): Promise<CostAuditSummaryDto> {
  try {
    const payload = await fetchJson(AUDIT_SUMMARY_URL);
    return CostAuditSummarySchema.parse(payload);
  } catch (error) {
    if (mode === 'SIMULATED') {
      return MOCK_COST_AUDIT_SUMMARY;
    }
    throw error;
  }
}

async function postRemediation(
  request: RemediationRequestDto,
  mode: AuditMode,
): Promise<RemediationResponseDto> {
  try {
    const payload = await fetchJson(REMEDIATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return RemediationResponseSchema.parse(payload);
  } catch (error) {
    if (mode === 'SIMULATED') {
      return simulatedRemediation(request);
    }
    throw error;
  }
}

export function useAuditSummary() {
  const mode = useDashboardStore((state) => state.mode);

  return useQuery({
    queryKey: ['audit-summary', mode],
    queryFn: () => fetchAuditSummary(mode),
    placeholderData: mode === 'SIMULATED' ? MOCK_COST_AUDIT_SUMMARY : undefined,
  });
}

export function useRemediateResource() {
  const queryClient = useQueryClient();
  const mode = useDashboardStore((state) => state.mode);

  return useMutation({
    mutationFn: (request: RemediationRequestDto) =>
      postRemediation(request, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-summary'] });
    },
  });
}
