import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  validatePasswordPolicy,
} from '@/lib/auth/password';

describe('hashPassword + verifyPassword', () => {
  it('hashes a password and verifies it correctly', async () => {
    const hash = await hashPassword('correct-password');
    expect(typeof hash).toBe('string');
    expect(hash).toMatch(/^\$argon2/);
    expect(await verifyPassword('correct-password', hash)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('correct-password');
    expect(await verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('returns false for malformed hash instead of throwing', async () => {
    expect(await verifyPassword('anything', 'not-a-hash')).toBe(false);
  });

  it('returns false for empty hash', async () => {
    expect(await verifyPassword('anything', '')).toBe(false);
  });
});

describe('validatePasswordPolicy', () => {
  it('returns null for valid passwords (8-200 chars)', () => {
    expect(validatePasswordPolicy('12345678')).toBeNull();
    expect(validatePasswordPolicy('a'.repeat(200))).toBeNull();
    expect(validatePasswordPolicy('a strong passphrase')).toBeNull();
  });

  it('rejects passwords shorter than 8 characters', () => {
    expect(validatePasswordPolicy('1234567')).toBe(
      'Password must be at least 8 characters long.',
    );
    expect(validatePasswordPolicy('')).toBe(
      'Password must be at least 8 characters long.',
    );
  });

  it('rejects passwords longer than 200 characters', () => {
    expect(validatePasswordPolicy('a'.repeat(201))).toBe(
      'Password is too long (max 200 characters).',
    );
  });
});
