import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

const API_KEY_HEADER = 'x-api-key';
const PUBLIC_GET_PATHS = new Set(['/api/audit/status', '/audit/status']);

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function requestPath(request: Request): string {
  const raw = request.path || request.url || '';
  return raw.split('?')[0];
}

function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const method = (request.method ?? 'GET').toUpperCase();
    if (method === 'GET' && PUBLIC_GET_PATHS.has(requestPath(request))) {
      return true;
    }

    const expected = process.env.AUDITOR_API_KEY?.trim();
    const provided = headerValue(request.headers[API_KEY_HEADER]);
    if (!expected || !provided || !secretsMatch(provided, expected)) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }
}
