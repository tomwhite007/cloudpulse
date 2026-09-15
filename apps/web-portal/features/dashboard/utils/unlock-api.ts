export async function postUnlockPassphrase(
  passphrase: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const response = await fetchImpl('/api/auth/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passphrase: passphrase.trim() }),
      cache: 'no-store',
    });
    const payload: unknown = await response.json().catch(() => null);
    if (response.ok && isUnlockSuccess(payload)) {
      return { ok: true };
    }
    return { ok: false, message: readUnlockError(payload, 'Invalid passphrase') };
  } catch {
    return { ok: false, message: 'Unable to unlock the live sandbox.' };
  }
}

export async function fetchEvaluatorSession(
  fetchImpl: typeof fetch = fetch,
): Promise<{ isEvaluator: boolean }> {
  try {
    const response = await fetchImpl('/api/auth/unlock', { cache: 'no-store' });
    const payload: unknown = await response.json().catch(() => null);
    return {
      isEvaluator: Boolean(
        payload &&
        typeof payload === 'object' &&
        'isEvaluator' in payload &&
        payload.isEvaluator === true,
      ),
    };
  } catch {
    return { isEvaluator: false };
  }
}

export async function lockEvaluatorSession(
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const response = await fetchImpl('/api/auth/unlock', {
      method: 'DELETE',
      cache: 'no-store',
    });
    const payload: unknown = await response.json().catch(() => null);
    if (response.ok && isUnlockSuccess(payload)) {
      return { ok: true };
    }
    return {
      ok: false,
      message: readUnlockError(payload, 'Unable to return to the simulated demo.'),
    };
  } catch {
    return { ok: false, message: 'Unable to return to the simulated demo.' };
  }
}

function isUnlockSuccess(payload: unknown): payload is { success: true } {
  return Boolean(
    payload && typeof payload === 'object' && 'success' in payload && payload.success === true,
  );
}

function readUnlockError(payload: unknown, fallback: string): string {
  if (
    payload &&
    typeof payload === 'object' &&
    'message' in payload &&
    typeof payload.message === 'string'
  ) {
    return payload.message;
  }
  return fallback;
}
