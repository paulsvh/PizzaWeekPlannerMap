import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock env to provide a test session secret.
vi.mock('@/lib/env', () => ({
  env: {
    get sessionSecret() {
      return 'test-secret-that-is-at-least-32-chars-long!!';
    },
  },
}));

// Mock next/headers cookies (session.ts imports it).
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

import { encrypt, decrypt } from '@/lib/auth/session';
import type { SessionPayload } from '@/lib/types';

const VALID_PAYLOAD: SessionPayload = {
  userId: 'user-1',
  displayName: 'Test User',
  role: 'user',
  expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour from now
};

describe('encrypt + decrypt', () => {
  it('round-trips a valid payload', async () => {
    const token = await encrypt(VALID_PAYLOAD);
    expect(typeof token).toBe('string');

    const result = await decrypt(token);
    expect(result).not.toBeNull();
    expect(result!.userId).toBe(VALID_PAYLOAD.userId);
    expect(result!.displayName).toBe(VALID_PAYLOAD.displayName);
    expect(result!.role).toBe(VALID_PAYLOAD.role);
    expect(result!.expiresAt).toBe(VALID_PAYLOAD.expiresAt);
  });

  it('returns null for undefined token', async () => {
    expect(await decrypt(undefined)).toBeNull();
  });

  it('returns null for empty string', async () => {
    expect(await decrypt('')).toBeNull();
  });

  it('returns null for tampered token', async () => {
    const token = await encrypt(VALID_PAYLOAD);
    const tampered = token.slice(0, -5) + 'XXXXX';
    expect(await decrypt(tampered)).toBeNull();
  });

  it('returns null for expired token', async () => {
    const expiredPayload: SessionPayload = {
      ...VALID_PAYLOAD,
      expiresAt: Date.now() - 1000, // expired 1 second ago
    };
    const token = await encrypt(expiredPayload);
    expect(await decrypt(token)).toBeNull();
  });

  it('returns null for an admin session with correct fields', async () => {
    const adminPayload: SessionPayload = {
      ...VALID_PAYLOAD,
      role: 'admin',
    };
    const token = await encrypt(adminPayload);
    const result = await decrypt(token);
    expect(result).not.toBeNull();
    expect(result!.role).toBe('admin');
  });
});
