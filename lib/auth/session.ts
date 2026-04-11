import 'server-only';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';
import type { SessionPayload } from '@/lib/types';

/**
 * Stateless session management using a jose-signed JWT stored in an
 * HttpOnly cookie. Follows the Next.js 16 `cookies()` async API.
 */

const COOKIE_NAME = 'pw_session';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getKey(): Uint8Array {
  return new TextEncoder().encode(env.sessionSecret);
}

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(new Date(payload.expiresAt))
    .sign(getKey());
}

export async function decrypt(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getKey(), {
      algorithms: ['HS256'],
    });
    if (
      typeof payload.userId !== 'string' ||
      typeof payload.displayName !== 'string' ||
      typeof payload.expiresAt !== 'number'
    ) {
      return null;
    }
    return {
      userId: payload.userId,
      displayName: payload.displayName,
      expiresAt: payload.expiresAt,
    };
  } catch {
    return null;
  }
}

export async function createSession(userId: string, displayName: string): Promise<void> {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const token = await encrypt({ userId, displayName, expiresAt });
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: new Date(expiresAt),
    path: '/',
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function readSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return decrypt(token);
}
