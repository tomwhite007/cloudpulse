import { NextResponse } from 'next/server';
import { auditorApiBaseUrl } from '@/features/dashboard/utils/audit-api';
import { createMockAuditBffPayload } from '@/features/dashboard/mocks/audit-api.mock';
import { getCloudPulseSession, isEvaluatorSession } from '@/lib/session';

const ALLOWED_AUDIT_PATHS = new Set(['summary', 'status', 'remediate']);

export interface AuditProxyDeps {
  getSession?: typeof getCloudPulseSession;
  fetchImpl?: typeof fetch;
}

export async function proxyAuditRequest(
  request: Request,
  path: string[],
  deps: AuditProxyDeps = {},
): Promise<Response> {
  if (path.length !== 1 || !ALLOWED_AUDIT_PATHS.has(path[0])) {
    return NextResponse.json({ message: 'Not Found' }, { status: 404 });
  }

  const getSession = deps.getSession ?? getCloudPulseSession;
  const session = await getSession();
  if (!isEvaluatorSession(session)) {
    return NextResponse.json(await createMockAuditBffPayload(path[0], request));
  }

  const target = `${auditorApiBaseUrl({ isBrowser: false })}/api/audit/${path[0]}`;
  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  if (contentType) {
    headers.set('content-type', contentType);
  }

  const fetchImpl = deps.fetchImpl ?? fetch;
  const response = await fetchImpl(target, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text(),
    cache: 'no-store',
  });

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
}

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
  deps: AuditProxyDeps = {},
) {
  const { path } = await context.params;
  return proxyAuditRequest(request, path, deps);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
  deps: AuditProxyDeps = {},
) {
  const { path } = await context.params;
  return proxyAuditRequest(request, path, deps);
}
