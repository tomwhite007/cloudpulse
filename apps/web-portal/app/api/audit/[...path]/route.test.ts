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

  it('forwards anonymous requests with x-cloudpulse-mode: demo header', async () => {
    vi.stubEnv('AUDITOR_API_URL', 'http://auditor.test');

    let received: { url: string; init?: RequestInit } | undefined;
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      received = { url: String(input), init };
      return jsonResponse({ mode: 'SIMULATED' });
    });

    const response = await GET(
      new Request('http://localhost/api/audit/status'),
      {
        params: Promise.resolve({ path: ['status'] }),
      },
      { ...anonymousSession, fetchImpl },
    );

    expect(fetchImpl).toHaveBeenCalled();
    expect(received?.url).toBe('http://auditor.test/api/audit/status');
    const headers = received?.init?.headers as Headers;
    expect(headers.get('x-cloudpulse-mode')).toBe('demo');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ mode: 'SIMULATED' });
  });

  it('forwards evaluator requests with x-cloudpulse-mode: live header', async () => {
    vi.stubEnv('AUDITOR_API_URL', 'http://auditor.test');

    let received: { url: string; init?: RequestInit } | undefined;
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      received = { url: String(input), init };
      return jsonResponse({ mode: 'LIVE' });
    });

    const response = await GET(
      new Request('http://localhost/api/audit/status'),
      {
        params: Promise.resolve({ path: ['status'] }),
      },
      { ...evaluatorSession, fetchImpl },
    );

    expect(fetchImpl).toHaveBeenCalled();
    expect(received?.url).toBe('http://auditor.test/api/audit/status');
    const headers = received?.init?.headers as Headers;
    expect(headers.get('x-cloudpulse-mode')).toBe('live');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ mode: 'LIVE' });
  });

  it('prefers AUDITOR_API_BASE_URL when forwarding requests', async () => {
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

  it('forwards remediate POST bodies to the auditor', async () => {
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
