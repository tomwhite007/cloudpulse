import {
  CostAuditSummarySchema,
  RemediationResponseSchema,
  type CostAuditSummaryDto,
  type RemediationRequestDto,
  type RemediationResponseDto,
} from '@cloudpulse/api-contracts';
import { MOCK_COST_AUDIT_SUMMARY } from '@cloudpulse/api-contracts/mocks';
import { env } from '@/lib/env';
import { createMockRemediationResponse } from '../mocks/audit-api.mock';

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

export interface AuditApiDeps {
  fetchJsonImpl?: typeof fetchJson;
  summaryUrl?: string;
  remediateUrl?: string;
  simulated?: typeof createMockRemediationResponse;
}

export function summaryEndpoint(deps: AuditApiDeps = {}): string {
  return deps.summaryUrl ?? `${env.NEXT_PUBLIC_AUDITOR_API_URL}/api/audit/summary`;
}

export function remediateEndpoint(deps: AuditApiDeps = {}): string {
  return deps.remediateUrl ?? `${env.NEXT_PUBLIC_AUDITOR_API_URL}/api/audit/remediate`;
}

export function statusEndpoint(deps: AuditApiDeps = {}): string {
  return deps.summaryUrl
    ? deps.summaryUrl.replace('/summary', '/status')
    : `${env.NEXT_PUBLIC_AUDITOR_API_URL}/api/audit/status`;
}

export async function fetchAuditStatus(deps: AuditApiDeps = {}) {
  const fetchJsonImpl = deps.fetchJsonImpl ?? fetchJson;
  try {
    const payload = await fetchJsonImpl(statusEndpoint(deps));
    return payload as { mode: 'SIMULATED' | 'LIVE'; profile?: string };
  } catch {
    return { mode: 'SIMULATED' as const };
  }
}

export async function fetchAuditSummary(deps: AuditApiDeps = {}): Promise<CostAuditSummaryDto> {
  const fetchJsonImpl = deps.fetchJsonImpl ?? fetchJson;

  try {
    const payload = await fetchJsonImpl(summaryEndpoint(deps));
    return CostAuditSummarySchema.parse(payload);
  } catch {
    return MOCK_COST_AUDIT_SUMMARY;
  }
}

export async function postRemediation(
  request: RemediationRequestDto,
  deps: AuditApiDeps = {},
): Promise<RemediationResponseDto> {
  const fetchJsonImpl = deps.fetchJsonImpl ?? fetchJson;
  const simulate = deps.simulated ?? createMockRemediationResponse;

  try {
    const payload = await fetchJsonImpl(remediateEndpoint(deps), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return RemediationResponseSchema.parse(payload);
  } catch {
    return simulate(request);
  }
}
