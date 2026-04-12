import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need to mock readSession (used by the DAL) and next/navigation.
vi.mock('@/lib/auth/session', () => ({
  readSession: vi.fn(),
}));

const redirectMock = vi.fn();
const notFoundMock = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => {
    redirectMock(...args);
    throw new Error('NEXT_REDIRECT');
  },
  notFound: (...args: unknown[]) => {
    notFoundMock(...args);
    throw new Error('NEXT_NOT_FOUND');
  },
}));

// React cache — just pass through in tests.
vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    cache: (fn: Function) => fn,
  };
});

import { readSession } from '@/lib/auth/session';
import {
  verifySession,
  verifyAdminSession,
  verifySessionOrNull,
} from '@/lib/auth/dal';
import { USER_SESSION, ADMIN_SESSION } from '../helpers/fixtures';

const mockedReadSession = vi.mocked(readSession);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('verifySession', () => {
  it('redirects to /login when no session', async () => {
    mockedReadSession.mockResolvedValue(null);
    await expect(verifySession()).rejects.toThrow('NEXT_REDIRECT');
    expect(redirectMock).toHaveBeenCalledWith('/login');
  });

  it('returns session payload when session exists', async () => {
    mockedReadSession.mockResolvedValue(USER_SESSION);
    const result = await verifySession();
    expect(result).toEqual(USER_SESSION);
  });
});

describe('verifyAdminSession', () => {
  it('redirects to /login when no session', async () => {
    mockedReadSession.mockResolvedValue(null);
    await expect(verifyAdminSession()).rejects.toThrow('NEXT_REDIRECT');
  });

  it('calls notFound for non-admin users', async () => {
    mockedReadSession.mockResolvedValue(USER_SESSION);
    await expect(verifyAdminSession()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFoundMock).toHaveBeenCalled();
  });

  it('returns session payload for admin users', async () => {
    mockedReadSession.mockResolvedValue(ADMIN_SESSION);
    const result = await verifyAdminSession();
    expect(result).toEqual(ADMIN_SESSION);
  });
});

describe('verifySessionOrNull', () => {
  it('returns null when no session (no redirect)', async () => {
    mockedReadSession.mockResolvedValue(null);
    const result = await verifySessionOrNull();
    expect(result).toBeNull();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('returns session payload when session exists', async () => {
    mockedReadSession.mockResolvedValue(USER_SESSION);
    const result = await verifySessionOrNull();
    expect(result).toEqual(USER_SESSION);
  });
});
