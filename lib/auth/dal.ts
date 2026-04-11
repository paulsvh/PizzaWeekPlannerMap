import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { readSession } from '@/lib/auth/session';
import type { SessionPayload } from '@/lib/types';

/**
 * Data Access Layer.
 *
 * `verifySession()` is the single source of truth for "is this request
 * authenticated?" — every Server Action, Route Handler, and authed page
 * should call it. React's `cache` memoizes the result for the duration of
 * a single render, so callers can use it freely without re-reading the
 * cookie on every call.
 *
 * Do not rely on `proxy.ts` for security — per the Next.js 16 docs, auth
 * checks must happen as close to the data as possible.
 */

export const verifySession = cache(async (): Promise<SessionPayload> => {
  const session = await readSession();
  if (!session) {
    redirect('/login');
  }
  return session;
});

export const verifySessionOrNull = cache(async (): Promise<SessionPayload | null> => {
  return readSession();
});
