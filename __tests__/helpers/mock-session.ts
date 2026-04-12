import { vi } from 'vitest';
import type { SessionPayload } from '@/lib/types';
import { USER_SESSION, ADMIN_SESSION } from './fixtures';

/**
 * Mock helpers for `@/lib/auth/dal`.
 *
 * Call one of these in your test's `beforeEach` to control what
 * verifySession / verifyAdminSession / verifySessionOrNull return.
 */

// The mock module — import this in test files that need session mocking.
vi.mock('@/lib/auth/dal', () => ({
  verifySession: vi.fn(),
  verifyAdminSession: vi.fn(),
  verifySessionOrNull: vi.fn(),
}));

// Re-export the mocked functions for easy access.
import {
  verifySession,
  verifyAdminSession,
  verifySessionOrNull,
} from '@/lib/auth/dal';

export const mockedVerifySession = vi.mocked(verifySession);
export const mockedVerifyAdminSession = vi.mocked(verifyAdminSession);
export const mockedVerifySessionOrNull = vi.mocked(verifySessionOrNull);

/** Configure all three DAL functions to return an authenticated user session. */
export function mockAuthenticatedSession(
  overrides?: Partial<SessionPayload>,
) {
  const session = { ...USER_SESSION, ...overrides };
  mockedVerifySession.mockResolvedValue(session);
  mockedVerifyAdminSession.mockRejectedValue(new Error('Not admin'));
  mockedVerifySessionOrNull.mockResolvedValue(session);
}

/** Configure all three DAL functions to return an admin session. */
export function mockAdminSession(overrides?: Partial<SessionPayload>) {
  const session = { ...ADMIN_SESSION, ...overrides };
  mockedVerifySession.mockResolvedValue(session);
  mockedVerifyAdminSession.mockResolvedValue(session);
  mockedVerifySessionOrNull.mockResolvedValue(session);
}

/** Configure all three DAL functions to behave as if no session exists. */
export function mockUnauthenticated() {
  mockedVerifySession.mockImplementation(async () => {
    // In the real code, verifySession calls redirect('/login') which throws.
    throw new RedirectError('/login');
  });
  mockedVerifyAdminSession.mockImplementation(async () => {
    throw new RedirectError('/login');
  });
  mockedVerifySessionOrNull.mockResolvedValue(null);
}

/**
 * Error class that simulates Next.js's redirect() throw.
 * Test code can catch this to verify redirect was called.
 */
export class RedirectError extends Error {
  readonly url: string;
  constructor(url: string) {
    super(`NEXT_REDIRECT: ${url}`);
    this.name = 'RedirectError';
    this.url = url;
  }
}
