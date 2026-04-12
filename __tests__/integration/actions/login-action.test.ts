import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all external dependencies before importing the action.
vi.mock('@/lib/auth/dal', () => ({
  verifySession: vi.fn(),
  verifyAdminSession: vi.fn(),
  verifySessionOrNull: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({
  getDb: vi.fn(),
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => Date.now() },
}));

vi.mock('@/lib/auth/session', () => ({
  createSession: vi.fn(),
  deleteSession: vi.fn(),
}));

vi.mock('@/lib/auth/password', () => ({
  verifyPassword: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

const redirectMock = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => {
    redirectMock(...args);
    throw new Error('NEXT_REDIRECT');
  },
}));

import { getDb } from '@/lib/firebase/admin';
import { createSession } from '@/lib/auth/session';
import { verifyPassword } from '@/lib/auth/password';
import { login, logout } from '@/app/login/actions';

const mockedGetDb = vi.mocked(getDb);
const mockedCreateSession = vi.mocked(createSession);
const mockedVerifyPassword = vi.mocked(verifyPassword);

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
}

// Helper to set up getDb mock with a user query result
function mockUserQuery(
  userData: Record<string, unknown> | null,
  docId = 'user-doc-1',
) {
  const docRef = { set: vi.fn().mockResolvedValue(undefined) };
  const docs = userData
    ? [{ id: docId, data: () => userData, ref: docRef }]
    : [];
  const snap = { empty: docs.length === 0, docs };
  const query = {
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue(snap),
  };
  const db = { collection: vi.fn().mockReturnValue(query) };
  mockedGetDb.mockReturnValue(db as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('login action', () => {
  it('returns field errors for invalid email', async () => {
    const result = await login(undefined, makeFormData({
      email: 'not-valid',
      password: 'pass',
    }));
    expect(result?.errors?.email).toBeDefined();
  });

  it('returns field errors for empty password', async () => {
    const result = await login(undefined, makeFormData({
      email: 'user@test.com',
      password: '',
    }));
    expect(result?.errors?.password).toBeDefined();
  });

  it('returns generic error when email not found', async () => {
    mockUserQuery(null);
    const result = await login(undefined, makeFormData({
      email: 'unknown@test.com',
      password: 'pass',
    }));
    expect(result?.errors?.form?.[0]).toBe('Incorrect email or password.');
  });

  it('returns error for account with no password hash', async () => {
    mockUserQuery({ emailLower: 'user@test.com', passwordHash: '' });
    const result = await login(undefined, makeFormData({
      email: 'user@test.com',
      password: 'pass',
    }));
    expect(result?.errors?.form?.[0]).toContain('no password set');
  });

  it('returns generic error when password is wrong', async () => {
    mockUserQuery({
      emailLower: 'user@test.com',
      passwordHash: '$argon2id$...',
      displayName: 'User',
      role: 'user',
    });
    mockedVerifyPassword.mockResolvedValue(false);
    const result = await login(undefined, makeFormData({
      email: 'user@test.com',
      password: 'wrong',
    }));
    expect(result?.errors?.form?.[0]).toBe('Incorrect email or password.');
  });

  it('creates session and redirects on success', async () => {
    mockUserQuery({
      emailLower: 'user@test.com',
      passwordHash: '$argon2id$valid',
      displayName: 'User',
      role: 'user',
    });
    mockedVerifyPassword.mockResolvedValue(true);
    mockedCreateSession.mockResolvedValue(undefined);

    await expect(
      login(undefined, makeFormData({ email: 'user@test.com', password: 'correct' })),
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockedCreateSession).toHaveBeenCalledWith('user-doc-1', 'User', 'user');
    expect(redirectMock).toHaveBeenCalledWith('/');
  });

  it('returns form error on Firestore failure', async () => {
    mockedGetDb.mockImplementation(() => {
      throw new Error('Firestore down');
    });
    const result = await login(undefined, makeFormData({
      email: 'user@test.com',
      password: 'pass',
    }));
    expect(result?.errors?.form?.[0]).toContain('Could not reach the database');
  });
});

describe('logout action', () => {
  it('deletes session and redirects to /login', async () => {
    const { deleteSession } = await import('@/lib/auth/session');
    const mockedDeleteSession = vi.mocked(deleteSession);
    mockedDeleteSession.mockResolvedValue(undefined);

    await expect(logout()).rejects.toThrow('NEXT_REDIRECT');
    expect(mockedDeleteSession).toHaveBeenCalled();
    expect(redirectMock).toHaveBeenCalledWith('/login');
  });
});
