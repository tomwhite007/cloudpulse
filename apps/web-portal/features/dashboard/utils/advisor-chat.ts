import type { CostAuditSummaryDto } from '@cloudpulse/api-contracts';
import { DefaultChatTransport } from 'ai';
import type { FetchLike } from './audit-api';

export const ADVISOR_CHAT_API = '/api/chat';

export type AuditContext = CostAuditSummaryDto | undefined;

export interface AdvisorChatDeps {
  fetchImpl?: FetchLike;
  chatUrl?: string;
}

export function advisorChatEndpoint(deps: AdvisorChatDeps = {}): string {
  return deps.chatUrl ?? ADVISOR_CHAT_API;
}

export function auditChatBody(auditContext: AuditContext) {
  return {
    auditContext,
    data: { auditContext },
  };
}

export function mergeAuditContextIntoChatBody(rawBody: string, auditContext: AuditContext): string {
  const parsed = JSON.parse(rawBody) as Record<string, unknown>;
  const existingData =
    parsed.data !== null && typeof parsed.data === 'object' && !Array.isArray(parsed.data)
      ? (parsed.data as Record<string, unknown>)
      : {};

  return JSON.stringify({
    ...parsed,
    ...auditChatBody(auditContext),
    data: {
      ...existingData,
      auditContext,
    },
  });
}

export function createAdvisorChatFetch(
  getAuditContext: () => AuditContext,
  fetchImpl: FetchLike = fetch,
): FetchLike {
  return async (input, init) => {
    if (init?.body && typeof init.body === 'string') {
      try {
        return fetchImpl(input, {
          ...init,
          body: mergeAuditContextIntoChatBody(init.body, getAuditContext()),
        });
      } catch {
        // Non-JSON bodies should pass through unchanged.
      }
    }

    return fetchImpl(input, init);
  };
}

export function createAdvisorChatTransport(
  getAuditContext: () => AuditContext,
  deps: AdvisorChatDeps = {},
) {
  const fetchImpl = deps.fetchImpl ?? fetch;

  return new DefaultChatTransport({
    api: advisorChatEndpoint(deps),
    body: () => auditChatBody(getAuditContext()),
    fetch: createAdvisorChatFetch(getAuditContext, fetchImpl),
  });
}
