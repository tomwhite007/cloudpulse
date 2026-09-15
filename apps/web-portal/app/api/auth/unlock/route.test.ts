import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CloudPulseSessionData } from '@/lib/session';
import {
  DEFAULT_DEMO_INVITE_PASSPHRASE,
  lockEvaluator,
  readUnlockStatus,
  unlockEvaluator,
} from './route';

function createSession(data: CloudPulseSessionData = {}) {
  return {
    ...data,
    save: vi.fn(async () => undefined),
    destroy: vi.fn(),
    updateConfig: vi.fn(),
  };
}

function unlockRequest(passphrase: unknown): Request {
  return new Request('http://localhost/api/auth/unlock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passphrase }),
  });
}

describe('/api/auth/unlock', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('sets the evaluator session when the passphrase matches', async () => {
    vi.stubEnv('DEMO_INVITE_PASSPHRASE', '');
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-01T12:00:00.000Z'));
    const session = createSession();

    const response = await unlockEvaluator(unlockRequest(DEFAULT_DEMO_INVITE_PASSPHRASE), {
      getSession: async () => session,
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, mode: 'LIVE' });
    expect(session.isEvaluator).toBe(true);
    expect(session.unlockedAt).toBe('2026-04-01T12:00:00.000Z');
    expect(session.save).toHaveBeenCalledTimes(1);
  });

  it('accepts a passphrase with surrounding whitespace', async () => {
    vi.stubEnv('DEMO_INVITE_PASSPHRASE', '');
    const session = createSession();
    const response = await unlockEvaluator(unlockRequest(`  ${DEFAULT_DEMO_INVITE_PASSPHRASE}  `), {
      getSession: async () => session,
    });

    expect(response.status).toBe(200);
    expect(session.isEvaluator).toBe(true);
  });

  it('accepts DEMO_INVITE_PASSPHRASE from the environment', async () => {
    vi.stubEnv('DEMO_INVITE_PASSPHRASE', 'invite-from-env');
    const session = createSession();

    const response = await unlockEvaluator(unlockRequest('invite-from-env'), {
      getSession: async () => session,
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, mode: 'LIVE' });
  });

  it('rejects an incorrect passphrase without writing a session', async () => {
    const session = createSession();
    const getSession = vi.fn(async () => session);

    const response = await unlockEvaluator(unlockRequest('wrong-passphrase'), { getSession });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: 'Invalid passphrase',
    });
    expect(getSession).not.toHaveBeenCalled();
    expect(session.save).not.toHaveBeenCalled();
  });

  it('rejects a malformed unlock payload', async () => {
    const response = await unlockEvaluator(
      new Request('http://localhost/api/auth/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{',
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: 'Invalid passphrase',
    });
  });

  it('reports the current evaluator flag', async () => {
    const locked = await readUnlockStatus({
      getSession: async () => createSession(),
    });
    await expect(locked.json()).resolves.toEqual({ isEvaluator: false });

    const unlocked = await readUnlockStatus({
      getSession: async () => createSession({ isEvaluator: true }),
    });
    await expect(unlocked.json()).resolves.toEqual({ isEvaluator: true });
  });

  it('destroys the evaluator session', async () => {
    const session = createSession({ isEvaluator: true, unlockedAt: '2026-04-01T12:00:00.000Z' });

    const response = await lockEvaluator({ getSession: async () => session });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, mode: 'SIMULATED' });
    expect(session.destroy).toHaveBeenCalledTimes(1);
  });
});
