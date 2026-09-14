import {
  AuditStatusSchema,
  CostAuditSummarySchema,
  RemediationResponseSchema,
  type AuditStatusDto,
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

export function auditorApiHeaders(source?: { AUDITOR_API_KEY?: string }): Record<string, string> {
  const apiKey = (
    source ?? { AUDITOR_API_KEY: process.env.AUDITOR_API_KEY }
  ).AUDITOR_API_KEY?.trim();
  if (!apiKey) {
    return {};
  }
  return { 'x-api-key': apiKey };
}

export async function fetchJson(
  url: string,
  init?: RequestInit,
  options: FetchJsonOptions = {},
): Promise<unknown> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const headers = new Headers(init?.headers);
  for (const [key, value] of Object.entries(auditorApiHeaders())) {
    headers.set(key, value);
  }
  const response = await fetchImpl(url, {
    ...init,
    headers,
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
  baseUrl?: string;
}

export function resolveAuditorApiBaseUrl(source: {
  auditorApiUrl?: string;
  publicAuditorApiUrl: string;
  isBrowser: boolean;
}): string {
  if (source.isBrowser) {
    return '';
  }
  if (source.auditorApiUrl && source.auditorApiUrl.length > 0) {
    return source.auditorApiUrl.replace(/\/$/, '');
  }
  return source.publicAuditorApiUrl.replace(/\/$/, '');
}

export function auditorApiBaseUrl(deps: AuditApiDeps = {}): string {
  if (deps.baseUrl && deps.baseUrl.length > 0) {
    return deps.baseUrl.replace(/\/$/, '');
  }
  return resolveAuditorApiBaseUrl({
    auditorApiUrl: process.env.AUDITOR_API_URL,
    publicAuditorApiUrl: env.NEXT_PUBLIC_AUDITOR_API_URL,
    isBrowser: typeof window !== 'undefined',
  });
}

export function summaryEndpoint(deps: AuditApiDeps = {}): string {
  return deps.summaryUrl ?? `${auditorApiBaseUrl(deps)}/api/audit/summary`;
}

export function remediateEndpoint(deps: AuditApiDeps = {}): string {
  return deps.remediateUrl ?? `${auditorApiBaseUrl(deps)}/api/audit/remediate`;
}

export function statusEndpoint(deps: AuditApiDeps = {}): string {
  return deps.summaryUrl
    ? deps.summaryUrl.replace('/summary', '/status')
    : `${auditorApiBaseUrl(deps)}/api/audit/status`;
}

export async function fetchAuditStatus(deps: AuditApiDeps = {}): Promise<AuditStatusDto> {
  const fetchJsonImpl = deps.fetchJsonImpl ?? fetchJson;
  try {
    const payload = await fetchJsonImpl(statusEndpoint(deps));
    return AuditStatusSchema.parse(payload);
  } catch {
    return { mode: 'SIMULATED' };
  }
}

async function isLiveAuditorMode(deps: AuditApiDeps): Promise<boolean> {
  const status = await fetchAuditStatus(deps);
  return status.mode === 'LIVE';
}

export async function fetchAuditSummary(deps: AuditApiDeps = {}): Promise<CostAuditSummaryDto> {
  const fetchJsonImpl = deps.fetchJsonImpl ?? fetchJson;

  try {
    const payload = await fetchJsonImpl(summaryEndpoint(deps));
    return CostAuditSummarySchema.parse(payload);
  } catch (error) {
    if (await isLiveAuditorMode(deps)) {
      throw error;
    }
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
  } catch (error) {
    if (await isLiveAuditorMode(deps)) {
      throw error;
    }
    return simulate(request);
  }
}
