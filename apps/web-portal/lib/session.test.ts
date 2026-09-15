import { afterEach, describe, expect, it, vi } from 'vitest';
import { FALLBACK_SESSION_PASSWORD, SESSION_COOKIE_NAME, getSessionOptions } from './session';

describe('getSessionOptions', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses the CloudPulse evaluator cookie name and fallback password', () => {
    vi.stubEnv('SESSION_SECRET', '');
    vi.stubEnv('NODE_ENV', 'test');

    expect(getSessionOptions()).toEqual({
      cookieName: SESSION_COOKIE_NAME,
      password: FALLBACK_SESSION_PASSWORD,
      cookieOptions: {
        secure: false,
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      },
    });
  });

  it('secures the cookie in production and prefers SESSION_SECRET', () => {
    vi.stubEnv('SESSION_SECRET', 'a-custom-session-secret-that-is-32b');
    vi.stubEnv('NODE_ENV', 'production');

    expect(getSessionOptions()).toMatchObject({
      cookieName: 'cloudpulse_evaluator_session',
      password: 'a-custom-session-secret-that-is-32b',
      cookieOptions: {
        secure: true,
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      },
    });
  });
});
