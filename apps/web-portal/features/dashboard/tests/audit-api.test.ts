import type { RemediationRequestDto } from '@cloudpulse/api-contracts';
import { MOCK_AUDIT_RESOURCES, MOCK_COST_AUDIT_SUMMARY } from '@cloudpulse/api-contracts/mocks';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  auditorApiBaseUrl,
  fetchAuditStatus,
  fetchAuditSummary,
  fetchJson,
  postRemediation,
  remediateEndpoint,
  resolveAuditorApiBaseUrl,
  summaryEndpoint,
} from '../utils/audit-api';
import { createMockRemediationResponse } from '../mocks/audit-api.mock';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const matchingRequest: RemediationRequestDto = {
  resourceId: MOCK_AUDIT_RESOURCES[0].id,
  actionId: MOCK_AUDIT_RESOURCES[0].recommendedAction.actionId,
};

describe('resolveAuditorApiBaseUrl', () => {
  it('uses the same-origin proxy in the browser', () => {
    expect(
      resolveAuditorApiBaseUrl({
        auditorApiBaseUrl: 'http://ecs.example:3333',
        auditorApiUrl: 'http://cloudpulse-auditor-api:3333',
        publicAuditorApiUrl: 'http://localhost:3333',
        isBrowser: true,
      }),
    ).toBe('');
  });

  it('prefers AUDITOR_API_BASE_URL over AUDITOR_API_URL on the server', () => {
    expect(
      resolveAuditorApiBaseUrl({
        auditorApiBaseUrl: 'http://ecs.example:3333/',
        auditorApiUrl: 'http://legacy.example:3333/',
        publicAuditorApiUrl: 'http://localhost:3333',
        isBrowser: false,
      }),
    ).toBe('http://ecs.example:3333');
  });

  it('falls back to AUDITOR_API_URL when AUDITOR_API_BASE_URL is empty', () => {
    expect(
      resolveAuditorApiBaseUrl({
        auditorApiBaseUrl: '  ',
        auditorApiUrl: 'http://cloudpulse-auditor-api:3333/',
        publicAuditorApiUrl: 'http://localhost:3333',
        isBrowser: false,
      }),
    ).toBe('http://cloudpulse-auditor-api:3333');
  });

  it('falls back to the public URL on the server when internal URLs are empty', () => {
    expect(
      resolveAuditorApiBaseUrl({
        auditorApiBaseUrl: '',
        auditorApiUrl: '',
        publicAuditorApiUrl: 'http://localhost:3000',
        isBrowser: false,
      }),
    ).toBe('http://localhost:3000');
  });

  it('returns an empty string when no server URLs are configured', () => {
    expect(
      resolveAuditorApiBaseUrl({
        auditorApiBaseUrl: '',
        auditorApiUrl: '',
        publicAuditorApiUrl: '',
        isBrowser: false,
      }),
    ).toBe('');
  });
});

describe('auditorApiBaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('strips a trailing slash from an injected base URL', () => {
    expect(auditorApiBaseUrl({ baseUrl: 'http://auditor.test/' })).toBe('http://auditor.test');
  });

  it('prefers AUDITOR_API_BASE_URL over AUDITOR_API_URL on the server', () => {
    vi.stubEnv('AUDITOR_API_BASE_URL', 'http://ecs.example:3333/');
    vi.stubEnv('AUDITOR_API_URL', 'http://legacy.example:3333/');
    expect(auditorApiBaseUrl({ isBrowser: false })).toBe('http://ecs.example:3333');
  });

  it('falls back to AUDITOR_API_URL when AUDITOR_API_BASE_URL is unset', () => {
    vi.stubEnv('AUDITOR_API_BASE_URL', '');
    vi.stubEnv('AUDITOR_API_URL', 'http://legacy.example:3333/');
    expect(auditorApiBaseUrl({ isBrowser: false })).toBe('http://legacy.example:3333');
  });
});

describe('summaryEndpoint', () => {
  it('uses the same-origin proxy by default in the browser', () => {
    expect(summaryEndpoint()).toBe('/api/audit/summary');
  });

  it('prefers an explicit summary URL', () => {
    expect(summaryEndpoint({ summaryUrl: 'https://auditor.test/summary' })).toBe(
      'https://auditor.test/summary',
    );
  });
});

describe('remediateEndpoint', () => {
  it('uses the same-origin proxy by default in the browser', () => {
    expect(remediateEndpoint()).toBe('/api/audit/remediate');
  });

  it('prefers an explicit remediate URL', () => {
    expect(remediateEndpoint({ remediateUrl: 'https://auditor.test/remediate' })).toBe(
      'https://auditor.test/remediate',
    );
  });
});

describe('fetchJson', () => {
  it('returns parsed JSON for a successful response', async () => {
    const fetchImpl: typeof fetch = async () => jsonResponse({ ok: true });
    await expect(
      fetchJson('http://example.test/summary', undefined, { fetchImpl }),
    ).resolves.toEqual({ ok: true });
  });

  it('throws when the response is not ok', async () => {
    const fetchImpl: typeof fetch = async () => jsonResponse({ error: true }, 503);
    await expect(
      fetchJson('http://example.test/summary', undefined, { fetchImpl }),
    ).rejects.toThrow('Request failed with status 503');
  });

  it('sends no-store cache and a timeout signal', async () => {
    let received: RequestInit | undefined;
    const fetchImpl: typeof fetch = async (_input, init) => {
      received = init;
      return jsonResponse({});
    };

    await fetchJson('http://example.test/summary', { method: 'GET' }, { fetchImpl, timeoutMs: 25 });

    expect(received?.cache).toBe('no-store');
    expect(received?.signal).toBeInstanceOf(AbortSignal);
    expect(received?.method).toBe('GET');
  });
});

describe('createMockRemediationResponse', () => {
  it('queues a matching 1-click action', () => {
    const queuedAt = '2026-09-04T12:00:00.000Z';
    expect(createMockRemediationResponse(matchingRequest, { nowIso: queuedAt })).toEqual({
      success: true,
      resourceId: matchingRequest.resourceId,
      message:
        'Queued Resize Instance for prod-payments-aurora. Terraform patch will apply in the next plan.',
      queuedAt,
    });
  });

  it('fails when the resource is unknown', () => {
    const queuedAt = '2026-09-04T12:00:00.000Z';
    expect(
      createMockRemediationResponse(
        { resourceId: 'missing', actionId: 'act-x' },
        { nowIso: queuedAt },
      ),
    ).toEqual({
      success: false,
      resourceId: 'missing',
      message: 'No matching 1-click remediation found for resource missing.',
      queuedAt,
    });
  });

  it('fails when the action id does not match', () => {
    const result = createMockRemediationResponse(
      {
        resourceId: matchingRequest.resourceId,
        actionId: 'wrong-action',
      },
      { nowIso: '2026-09-04T12:00:00.000Z' },
    );
    expect(result.success).toBe(false);
  });
});

describe('fetchAuditSummary', () => {
  it('parses a valid payload', async () => {
    const summary = await fetchAuditSummary({
      fetchJsonImpl: async () => MOCK_COST_AUDIT_SUMMARY,
    });
    expect(summary.totalMonthlySpend).toBe(MOCK_COST_AUDIT_SUMMARY.totalMonthlySpend);
  });

  it('throws when network fails', async () => {
    await expect(
      fetchAuditSummary({
        fetchJsonImpl: async () => {
          throw new Error('network down');
        },
      }),
    ).rejects.toThrow('network down');
  });

  it('throws when the payload fails Zod schema validation', async () => {
    await expect(
      fetchAuditSummary({
        fetchJsonImpl: async () => ({ not: 'a summary' }),
      }),
    ).rejects.toThrow();
  });
});

describe('fetchAuditStatus', () => {
  it('returns status payload when status endpoint succeeds', async () => {
    await expect(
      fetchAuditStatus({
        fetchJsonImpl: async () => ({ mode: 'LIVE', profile: 'sandbox' }),
      }),
    ).resolves.toEqual({ mode: 'LIVE', profile: 'sandbox' });
  });

  it('throws when status endpoint cannot be reached', async () => {
    await expect(
      fetchAuditStatus({
        fetchJsonImpl: async () => {
          throw new Error('network down');
        },
      }),
    ).rejects.toThrow('network down');
  });
});

describe('postRemediation', () => {
  it('parses a successful API payload', async () => {
    const payload = {
      success: true,
      resourceId: matchingRequest.resourceId,
      message: 'queued',
      queuedAt: '2026-09-04T12:00:00.000Z',
    };
    const result = await postRemediation(matchingRequest, {
      fetchJsonImpl: async () => payload,
    });
    expect(result).toEqual(payload);
  });

  it('throws when remediation API request fails', async () => {
    await expect(
      postRemediation(matchingRequest, {
        fetchJsonImpl: async () => {
          throw new Error('network down');
        },
      }),
    ).rejects.toThrow('network down');
  });
});
