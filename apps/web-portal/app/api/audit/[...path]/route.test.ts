import { MOCK_AUDIT_RESOURCES, MOCK_COST_AUDIT_SUMMARY } from '@cloudpulse/api-contracts/mocks';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CloudPulseSessionData } from '@/lib/session';
import { GET, POST, proxyAuditRequest } from './route';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function createSession(data: CloudPulseSessionData = {}) {
  return {
    ...data,
    save: vi.fn(async () => undefined),
    destroy: vi.fn(),
    updateConfig: vi.fn(),
  };
}

const anonymousSession = { getSession: async () => createSession() };
const evaluatorSession = { getSession: async () => createSession({ isEvaluator: true }) };

describe('GET/POST /api/audit/[...path]', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('rejects unknown audit paths', async () => {
    const response = await proxyAuditRequest(
      new Request('http://localhost/api/audit/secret'),
      ['secret'],
      anonymousSession,
    );
    expect(response.status).toBe(404);
  });

  it('returns simulated status when the evaluator session is missing', async () => {
    const fetchImpl = vi.fn();
    const response = await GET(
      new Request('http://localhost/api/audit/status'),
      {
        params: Promise.resolve({ path: ['status'] }),
      },
      { ...anonymousSession, fetchImpl },
    );

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ mode: 'SIMULATED', status: 'ok' });
  });

  it('returns canned summary data when the evaluator session is missing', async () => {
    const fetchImpl = vi.fn();
    const response = await GET(
      new Request('http://localhost/api/audit/summary'),
      {
        params: Promise.resolve({ path: ['summary'] }),
      },
      { ...anonymousSession, fetchImpl },
    );

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(MOCK_COST_AUDIT_SUMMARY);
  });

  it('returns a mock remediation payload when the evaluator session is missing', async () => {
    const fetchImpl = vi.fn();
    const resource = MOCK_AUDIT_RESOURCES[0];
    const response = await POST(
      new Request('http://localhost/api/audit/remediate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceId: resource.id,
          actionId: resource.recommendedAction.actionId,
        }),
      }),
      { params: Promise.resolve({ path: ['remediate'] }) },
      { ...anonymousSession, fetchImpl },
    );

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      resourceId: resource.id,
      message: expect.stringContaining(resource.recommendedAction.label),
    });
  });

  it('prefers AUDITOR_API_BASE_URL when forwarding authenticated requests', async () => {
    vi.stubEnv('AUDITOR_API_BASE_URL', 'http://ecs.test/');
    vi.stubEnv('AUDITOR_API_URL', 'http://legacy.test');

    let received: { url: string; init?: RequestInit } | undefined;
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      received = { url: String(input), init };
      return jsonResponse({ totalMonthlySpend: 1 });
    });

    const response = await GET(
      new Request('http://localhost/api/audit/summary'),
      {
        params: Promise.resolve({ path: ['summary'] }),
      },
      evaluatorSession,
    );

    expect(received?.url).toBe('http://ecs.test/api/audit/summary');
    expect(response.status).toBe(200);
  });

  it('forwards authenticated summary requests to the auditor', async () => {
    vi.stubEnv('AUDITOR_API_BASE_URL', '');
    vi.stubEnv('AUDITOR_API_URL', 'http://auditor.test');

    let received: { url: string; init?: RequestInit } | undefined;
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      received = { url: String(input), init };
      return jsonResponse({ totalMonthlySpend: 1 });
    });

    const response = await GET(
      new Request('http://localhost/api/audit/summary'),
      {
        params: Promise.resolve({ path: ['summary'] }),
      },
      evaluatorSession,
    );

    expect(received?.url).toBe('http://auditor.test/api/audit/summary');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ totalMonthlySpend: 1 });
  });

  it('forwards authenticated remediate POST bodies', async () => {
    vi.stubEnv('AUDITOR_API_BASE_URL', '');
    vi.stubEnv('AUDITOR_API_URL', 'http://auditor.test');

    let received: { url: string; init?: RequestInit } | undefined;
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      received = { url: String(input), init };
      return jsonResponse({ success: true });
    });

    const response = await POST(
      new Request('http://localhost/api/audit/remediate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceId: 'vol-1' }),
      }),
      { params: Promise.resolve({ path: ['remediate'] }) },
      evaluatorSession,
    );

    expect(received?.url).toBe('http://auditor.test/api/audit/remediate');
    expect(received?.init?.method).toBe('POST');
    expect(received?.init?.body).toBe(JSON.stringify({ resourceId: 'vol-1' }));
    expect(response.status).toBe(200);
  });
});
