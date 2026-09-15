import { getIronSession, type IronSession, type SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

export interface CloudPulseSessionData {
  isEvaluator?: boolean;
  unlockedAt?: string;
}

export const SESSION_COOKIE_NAME = 'cloudpulse_evaluator_session';
export const FALLBACK_SESSION_PASSWORD = 'cloudpulse_secret_session_encryption_key_32bytes_long';

export function getSessionOptions(): SessionOptions {
  return {
    cookieName: SESSION_COOKIE_NAME,
    password: process.env.SESSION_SECRET || FALLBACK_SESSION_PASSWORD,
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    },
  };
}

export async function getCloudPulseSession(): Promise<IronSession<CloudPulseSessionData>> {
  return getIronSession<CloudPulseSessionData>(await cookies(), getSessionOptions());
}

export function isEvaluatorSession(session: CloudPulseSessionData): boolean {
  return session.isEvaluator === true;
}
