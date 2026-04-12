import { describe, it, expect } from 'vitest';
import {
  generateInviteToken,
  hashInviteToken,
  computeInviteExpiry,
  isInviteExpired,
  buildInviteUrl,
  INVITE_EXPIRY_MS,
} from '@/lib/auth/invites';

describe('generateInviteToken', () => {
  it('returns a base64url string of ~43 chars (32 bytes)', () => {
    const token = generateInviteToken();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThanOrEqual(40);
    // base64url charset
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('generates unique tokens on successive calls', () => {
    const a = generateInviteToken();
    const b = generateInviteToken();
    expect(a).not.toBe(b);
  });
});

describe('hashInviteToken', () => {
  it('returns a deterministic hash', () => {
    const hash1 = hashInviteToken('test-token');
    const hash2 = hashInviteToken('test-token');
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different inputs', () => {
    const h1 = hashInviteToken('token-a');
    const h2 = hashInviteToken('token-b');
    expect(h1).not.toBe(h2);
  });

  it('returns a base64url string', () => {
    const hash = hashInviteToken('any-token');
    expect(hash).toMatch(/^[A-Za-z0-9_-]+=*$/);
  });
});

describe('computeInviteExpiry', () => {
  it('returns now + 7 days by default', () => {
    const now = Date.now();
    const expiry = computeInviteExpiry(now);
    expect(expiry).toBe(now + INVITE_EXPIRY_MS);
  });

  it('uses Date.now() when no argument given', () => {
    const before = Date.now();
    const expiry = computeInviteExpiry();
    const after = Date.now();
    expect(expiry).toBeGreaterThanOrEqual(before + INVITE_EXPIRY_MS);
    expect(expiry).toBeLessThanOrEqual(after + INVITE_EXPIRY_MS);
  });
});

describe('isInviteExpired', () => {
  it('returns true when expiresAt is in the past', () => {
    expect(isInviteExpired(Date.now() - 1000)).toBe(true);
  });

  it('returns false when expiresAt is in the future', () => {
    expect(isInviteExpired(Date.now() + 60_000)).toBe(false);
  });

  it('respects the custom now parameter', () => {
    const fixed = 1000000;
    expect(isInviteExpired(999999, fixed)).toBe(true);
    expect(isInviteExpired(1000001, fixed)).toBe(false);
  });
});

describe('buildInviteUrl', () => {
  it('builds the correct URL', () => {
    expect(buildInviteUrl('https://example.com', 'abc123')).toBe(
      'https://example.com/invite/abc123',
    );
  });

  it('trims trailing slashes from appUrl', () => {
    expect(buildInviteUrl('https://example.com/', 'token')).toBe(
      'https://example.com/invite/token',
    );
    expect(buildInviteUrl('https://example.com///', 'token')).toBe(
      'https://example.com/invite/token',
    );
  });
});
