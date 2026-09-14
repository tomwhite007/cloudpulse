import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';

function createContext(
  headers: Record<string, string | string[] | undefined>,
  path = '/api/audit/summary',
  method = 'GET',
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers,
        path,
        url: path,
        method,
      }),
    }),
  } as ExecutionContext;
}

describe('ApiKeyGuard', () => {
  const originalKey = process.env.AUDITOR_API_KEY;
  const guard = new ApiKeyGuard();

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.AUDITOR_API_KEY;
    } else {
      process.env.AUDITOR_API_KEY = originalKey;
    }
  });

  it('rejects requests when AUDITOR_API_KEY is unset', () => {
    delete process.env.AUDITOR_API_KEY;
    expect(() => guard.canActivate(createContext({}))).toThrow(UnauthorizedException);
  });

  it('rejects requests when AUDITOR_API_KEY is blank', () => {
    process.env.AUDITOR_API_KEY = '  ';
    expect(() => guard.canActivate(createContext({}))).toThrow(UnauthorizedException);
  });

  it('allows GET /api/audit/status without a key', () => {
    process.env.AUDITOR_API_KEY = 'secret-key';
    expect(
      guard.canActivate(createContext({}, '/api/audit/status', 'GET')),
    ).toBe(true);
  });

  it('allows a matching x-api-key header', () => {
    process.env.AUDITOR_API_KEY = 'secret-key';
    expect(
      guard.canActivate(createContext({ 'x-api-key': 'secret-key' })),
    ).toBe(true);
  });

  it('rejects a presented header when AUDITOR_API_KEY is unset', () => {
    delete process.env.AUDITOR_API_KEY;
    expect(() =>
      guard.canActivate(createContext({ 'x-api-key': 'any-key' })),
    ).toThrow(UnauthorizedException);
  });

  it('rejects a missing key when AUDITOR_API_KEY is set', () => {
    process.env.AUDITOR_API_KEY = 'secret-key';
    expect(() => guard.canActivate(createContext({}))).toThrow(UnauthorizedException);
  });

  it('rejects a mismatched key', () => {
    process.env.AUDITOR_API_KEY = 'secret-key';
    expect(() =>
      guard.canActivate(createContext({ 'x-api-key': 'wrong-key' })),
    ).toThrow(UnauthorizedException);
  });
});
