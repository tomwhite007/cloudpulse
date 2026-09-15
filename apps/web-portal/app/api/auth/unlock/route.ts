import { NextResponse } from 'next/server';
import { getCloudPulseSession } from '@/lib/session';

export const DEFAULT_DEMO_INVITE_PASSPHRASE = 'cloudpulse-evaluator-2026';

export interface UnlockRouteDeps {
  getSession?: typeof getCloudPulseSession;
  invitePassphrase?: string;
}

function resolveInvitePassphrase(deps: UnlockRouteDeps = {}): string {
  if (deps.invitePassphrase) {
    return deps.invitePassphrase;
  }
  const envVal = process.env.DEMO_INVITE_PASSPHRASE?.trim();
  return envVal && envVal.length > 0 ? envVal : DEFAULT_DEMO_INVITE_PASSPHRASE;
}

async function readPassphrase(request: Request): Promise<string | undefined> {
  try {
    const body: unknown = await request.json();
    if (
      body &&
      typeof body === 'object' &&
      'passphrase' in body &&
      typeof body.passphrase === 'string'
    ) {
      return body.passphrase;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export async function unlockEvaluator(request: Request, deps: UnlockRouteDeps = {}) {
  const passphrase = await readPassphrase(request);
  const expected = resolveInvitePassphrase(deps);

  if (passphrase?.trim() !== expected) {
    return NextResponse.json({ success: false, message: 'Invalid passphrase' }, { status: 401 });
  }

  const getSession = deps.getSession ?? getCloudPulseSession;
  const session = await getSession();
  session.isEvaluator = true;
  session.unlockedAt = new Date().toISOString();
  await session.save();

  return NextResponse.json({ success: true, mode: 'LIVE' });
}

export async function readUnlockStatus(deps: UnlockRouteDeps = {}) {
  const getSession = deps.getSession ?? getCloudPulseSession;
  const session = await getSession();
  return NextResponse.json({ isEvaluator: Boolean(session.isEvaluator) });
}

export async function lockEvaluator(deps: UnlockRouteDeps = {}) {
  const getSession = deps.getSession ?? getCloudPulseSession;
  const session = await getSession();
  session.destroy();
  return NextResponse.json({ success: true, mode: 'SIMULATED' });
}

export async function POST(request: Request) {
  return unlockEvaluator(request);
}

export async function GET() {
  return readUnlockStatus();
}

export async function DELETE() {
  return lockEvaluator();
}
