import {
  MOCK_AUDIT_RESOURCES,
  MOCK_COST_AUDIT_SUMMARY,
  CostAuditSummarySchema,
  RemediationResponseSchema,
  type CostAuditSummaryDto,
  type RemediationRequestDto,
  type RemediationResponseDto,
  type ResourceStatusCardDto,
} from '@cloudpulse/api-contracts';
import { env } from '@/lib/env';
import type { AuditMode } from './filters';

export const REQUEST_TIMEOUT_MS = 4000;

export type FetchLike = typeof fetch;

export interface FetchJsonOptions {
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}

export async function fetchJson(
  url: string,
  init?: RequestInit,
  options: FetchJsonOptions = {},
): Promise<unknown> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const response = await fetchImpl(url, {
    ...init,
    cache: 'no-store',
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

export interface SimulatedRemediationDeps {
  resources?: ResourceStatusCardDto[];
  nowIso?: string;
}

export function simulatedRemediation(
  request: RemediationRequestDto,
  deps: SimulatedRemediationDeps = {},
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

export interface AuditApiDeps {
  fetchJsonImpl?: typeof fetchJson;
  summaryUrl?: string;
  remediateUrl?: string;
  simulated?: typeof simulatedRemediation;
}

function summaryEndpoint(deps: AuditApiDeps): string {
  return deps.summaryUrl ?? `${env.NEXT_PUBLIC_AUDITOR_API_URL}/api/audit/summary`;
}

function remediateEndpoint(deps: AuditApiDeps): string {
  return (
    deps.remediateUrl ??
    `${env.NEXT_PUBLIC_AUDITOR_API_URL}/api/audit/remediate`
  );
}

export async function fetchAuditSummary(
  mode: AuditMode,
  deps: AuditApiDeps = {},
): Promise<CostAuditSummaryDto> {
  const fetchJsonImpl = deps.fetchJsonImpl ?? fetchJson;

  try {
    const payload = await fetchJsonImpl(summaryEndpoint(deps));
    return CostAuditSummarySchema.parse(payload);
  } catch (error) {
    if (mode === 'SIMULATED') {
      return MOCK_COST_AUDIT_SUMMARY;
    }
    throw error;
  }
}

export async function postRemediation(
  request: RemediationRequestDto,
  mode: AuditMode,
  deps: AuditApiDeps = {},
): Promise<RemediationResponseDto> {
  const fetchJsonImpl = deps.fetchJsonImpl ?? fetchJson;
  const simulate = deps.simulated ?? simulatedRemediation;

  try {
    const payload = await fetchJsonImpl(remediateEndpoint(deps), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return RemediationResponseSchema.parse(payload);
  } catch (error) {
    if (mode === 'SIMULATED') {
      return simulate(request);
    }
    throw error;
  }
}
