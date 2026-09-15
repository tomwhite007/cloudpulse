import { describe, expect, it, vi } from 'vitest';
import {
  fetchEvaluatorSession,
  lockEvaluatorSession,
  postUnlockPassphrase,
} from '../utils/unlock-api';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('postUnlockPassphrase', () => {
  it('posts the passphrase and reports success', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ success: true, mode: 'LIVE' }));

    await expect(postUnlockPassphrase('  cloudpulse-evaluator-2026  ', fetchImpl)).resolves.toEqual(
      {
        ok: true,
      },
    );
    expect(fetchImpl).toHaveBeenCalledWith('/api/auth/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passphrase: 'cloudpulse-evaluator-2026' }),
      cache: 'no-store',
    });
  });

  it('returns the API error message when the passphrase is rejected', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ success: false, message: 'Invalid passphrase' }, 401),
    );

    await expect(postUnlockPassphrase('nope', fetchImpl)).resolves.toEqual({
      ok: false,
      message: 'Invalid passphrase',
    });
  });

  it('falls back when the unlock response has no message', async () => {
    const fetchImpl = vi.fn(async () => new Response('nope', { status: 500 }));

    await expect(postUnlockPassphrase('nope', fetchImpl)).resolves.toEqual({
      ok: false,
      message: 'Invalid passphrase',
    });
  });

  it('falls back when the unlock request cannot be sent', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('offline');
    });

    await expect(postUnlockPassphrase('nope', fetchImpl)).resolves.toEqual({
      ok: false,
      message: 'Unable to unlock the live sandbox.',
    });
  });
});

describe('fetchEvaluatorSession', () => {
  it('reads the evaluator flag from the unlock route', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ isEvaluator: true }));
    await expect(fetchEvaluatorSession(fetchImpl)).resolves.toEqual({ isEvaluator: true });
  });

  it('treats a missing or failed session as locked', async () => {
    await expect(fetchEvaluatorSession(async () => jsonResponse({}))).resolves.toEqual({
      isEvaluator: false,
    });
    await expect(
      fetchEvaluatorSession(async () => {
        throw new Error('offline');
      }),
    ).resolves.toEqual({ isEvaluator: false });
  });
});

describe('lockEvaluatorSession', () => {
  it('clears the evaluator session', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ success: true, mode: 'SIMULATED' }));
    await expect(lockEvaluatorSession(fetchImpl)).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledWith('/api/auth/unlock', {
      method: 'DELETE',
      cache: 'no-store',
    });
  });

  it('falls back when the lock request cannot be sent', async () => {
    await expect(
      lockEvaluatorSession(async () => {
        throw new Error('offline');
      }),
    ).resolves.toEqual({
      ok: false,
      message: 'Unable to return to the simulated demo.',
    });
  });

  it('falls back when the lock response has no message', async () => {
    await expect(
      lockEvaluatorSession(async () => new Response('nope', { status: 500 })),
    ).resolves.toEqual({
      ok: false,
      message: 'Unable to return to the simulated demo.',
    });
  });
});
