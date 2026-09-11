import type { RemediationRequestDto } from '@cloudpulse/api-contracts';
import { MOCK_AUDIT_RESOURCES, MOCK_COST_AUDIT_SUMMARY } from '@cloudpulse/api-contracts/mocks';
import { describe, expect, it } from 'vitest';
import {
  fetchAuditSummary,
  fetchJson,
  postRemediation,
  remediateEndpoint,
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

describe('summaryEndpoint', () => {
  it('uses the env API base by default', () => {
    expect(summaryEndpoint()).toBe('http://localhost:3000/api/audit/summary');
  });

  it('prefers an explicit summary URL', () => {
    expect(summaryEndpoint({ summaryUrl: 'https://auditor.test/summary' })).toBe(
      'https://auditor.test/summary',
    );
  });
});

describe('remediateEndpoint', () => {
  it('uses the env API base by default', () => {
    expect(remediateEndpoint()).toBe('http://localhost:3000/api/audit/remediate');
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

  it('uses an injected resource catalog instead of the contract mock', () => {
    const queuedAt = '2026-09-04T12:00:00.000Z';
    const custom = {
      ...MOCK_AUDIT_RESOURCES[0],
      id: 'custom-rds',
      resourceName: 'custom-rds',
      recommendedAction: {
        ...MOCK_AUDIT_RESOURCES[0].recommendedAction,
        actionId: 'act-custom',
        label: 'Resize Custom',
      },
    };

    expect(
      createMockRemediationResponse(
        { resourceId: 'custom-rds', actionId: 'act-custom' },
        { resources: [custom], nowIso: queuedAt },
      ),
    ).toEqual({
      success: true,
      resourceId: 'custom-rds',
      message: 'Queued Resize Custom for custom-rds. Terraform patch will apply in the next plan.',
      queuedAt,
    });
  });
});

describe('fetchAuditSummary', () => {
  it('parses a live payload', async () => {
    const summary = await fetchAuditSummary({
      fetchJsonImpl: async () => MOCK_COST_AUDIT_SUMMARY,
    });
    expect(summary.totalMonthlySpend).toBe(MOCK_COST_AUDIT_SUMMARY.totalMonthlySpend);
  });

  it('falls back to the mock summary when network fails', async () => {
    const summary = await fetchAuditSummary({
      fetchJsonImpl: async () => {
        throw new Error('network down');
      },
    });
    expect(summary).toEqual(MOCK_COST_AUDIT_SUMMARY);
  });

  it('falls back when the payload fails Zod', async () => {
    const summary = await fetchAuditSummary({
      fetchJsonImpl: async () => ({ not: 'a summary' }),
    });
    expect(summary).toEqual(MOCK_COST_AUDIT_SUMMARY);
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

  it('falls back to simulated remediation when cannot reach the API', async () => {
    const result = await postRemediation(matchingRequest, {
      fetchJsonImpl: async () => {
        throw new Error('network down');
      },
      simulated: (request) =>
        createMockRemediationResponse(request, { nowIso: '2026-09-04T12:00:00.000Z' }),
    });
    expect(result.success).toBe(true);
    expect(result.resourceId).toBe(matchingRequest.resourceId);
  });

  it('falls back to the default simulated helper when none is injected', async () => {
    const result = await postRemediation(matchingRequest, {
      fetchJsonImpl: async () => {
        throw new Error('network down');
      },
    });
    expect(result.success).toBe(true);
    expect(result.resourceId).toBe(matchingRequest.resourceId);
  });
});
