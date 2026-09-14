import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET, POST, proxyAuditRequest } from './route';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('GET/POST /api/audit/[...path]', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('rejects unknown audit paths', async () => {
    const response = await proxyAuditRequest(
      new Request('http://localhost/api/audit/secret'),
      ['secret'],
    );
    expect(response.status).toBe(404);
  });

  it('prefers AUDITOR_API_BASE_URL when forwarding to the auditor', async () => {
    vi.stubEnv('AUDITOR_API_BASE_URL', 'http://ecs.test/');
    vi.stubEnv('AUDITOR_API_URL', 'http://legacy.test');
    vi.stubEnv('AUDITOR_API_KEY', 'secret-key');

    let received: { url: string; init?: RequestInit } | undefined;
    vi.stubGlobal(
      'fetch',
      async (input: RequestInfo | URL, init?: RequestInit) => {
        received = { url: String(input), init };
        return jsonResponse({ totalMonthlySpend: 1 });
      },
    );

    const response = await GET(new Request('http://localhost/api/audit/summary'), {
      params: Promise.resolve({ path: ['summary'] }),
    });

    expect(received?.url).toBe('http://ecs.test/api/audit/summary');
    expect(new Headers(received?.init?.headers).get('x-api-key')).toBe('secret-key');
    expect(response.status).toBe(200);
  });

  it('forwards summary to the auditor with x-api-key', async () => {
    vi.stubEnv('AUDITOR_API_URL', 'http://auditor.test');
    vi.stubEnv('AUDITOR_API_KEY', 'secret-key');

    let received: { url: string; init?: RequestInit } | undefined;
    vi.stubGlobal(
      'fetch',
      async (input: RequestInfo | URL, init?: RequestInit) => {
        received = { url: String(input), init };
        return jsonResponse({ totalMonthlySpend: 1 });
      },
    );

    const response = await GET(new Request('http://localhost/api/audit/summary'), {
      params: Promise.resolve({ path: ['summary'] }),
    });

    expect(received?.url).toBe('http://auditor.test/api/audit/summary');
    expect(new Headers(received?.init?.headers).get('x-api-key')).toBe('secret-key');
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ totalMonthlySpend: 1 });
  });

  it('forwards remediate POST bodies', async () => {
    vi.stubEnv('AUDITOR_API_URL', 'http://auditor.test');
    vi.stubEnv('AUDITOR_API_KEY', 'secret-key');

    let received: { url: string; init?: RequestInit } | undefined;
    vi.stubGlobal(
      'fetch',
      async (input: RequestInfo | URL, init?: RequestInit) => {
        received = { url: String(input), init };
        return jsonResponse({ success: true });
      },
    );

    const response = await POST(
      new Request('http://localhost/api/audit/remediate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceId: 'vol-1' }),
      }),
      { params: Promise.resolve({ path: ['remediate'] }) },
    );

    expect(received?.url).toBe('http://auditor.test/api/audit/remediate');
    expect(received?.init?.method).toBe('POST');
    expect(received?.init?.body).toBe(JSON.stringify({ resourceId: 'vol-1' }));
    expect(response.status).toBe(200);
  });
});
