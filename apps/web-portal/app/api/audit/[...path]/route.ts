import { NextResponse } from 'next/server';
import { auditorApiBaseUrl } from '@/features/dashboard/utils/audit-api';

const ALLOWED_AUDIT_PATHS = new Set(['summary', 'status', 'remediate']);

export async function proxyAuditRequest(request: Request, path: string[]): Promise<Response> {
  if (path.length !== 1 || !ALLOWED_AUDIT_PATHS.has(path[0])) {
    return NextResponse.json({ message: 'Not Found' }, { status: 404 });
  }

  const target = `${auditorApiBaseUrl({ isBrowser: false })}/api/audit/${path[0]}`;
  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  if (contentType) {
    headers.set('content-type', contentType);
  }

  const response = await fetch(target, {
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
) {
  const { path } = await context.params;
  return proxyAuditRequest(request, path);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return proxyAuditRequest(request, path);
}
