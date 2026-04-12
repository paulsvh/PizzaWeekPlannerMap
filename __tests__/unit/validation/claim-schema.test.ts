import { describe, it, expect } from 'vitest';
import { ClaimSchema } from '@/lib/validation/claim-schema';

const VALID_CLAIM = {
  token: 'abc123',
  displayName: 'Pizza Fan',
  password: 'securepass',
  passwordConfirm: 'securepass',
};

describe('ClaimSchema', () => {
  it('accepts valid claim data', () => {
    expect(ClaimSchema.safeParse(VALID_CLAIM).success).toBe(true);
  });

  it('trims display name', () => {
    const result = ClaimSchema.safeParse({
      ...VALID_CLAIM,
      displayName: '  Pizza Fan  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).toBe('Pizza Fan');
    }
  });

  it('rejects empty display name', () => {
    expect(
      ClaimSchema.safeParse({ ...VALID_CLAIM, displayName: '' }).success,
    ).toBe(false);
  });

  it('rejects display name over 40 characters', () => {
    expect(
      ClaimSchema.safeParse({
        ...VALID_CLAIM,
        displayName: 'a'.repeat(41),
      }).success,
    ).toBe(false);
  });

  it('accepts display name of exactly 40 characters', () => {
    expect(
      ClaimSchema.safeParse({
        ...VALID_CLAIM,
        displayName: 'a'.repeat(40),
      }).success,
    ).toBe(true);
  });

  it('rejects empty token', () => {
    expect(
      ClaimSchema.safeParse({ ...VALID_CLAIM, token: '' }).success,
    ).toBe(false);
  });

  it('rejects empty password', () => {
    expect(
      ClaimSchema.safeParse({ ...VALID_CLAIM, password: '' }).success,
    ).toBe(false);
  });
});
