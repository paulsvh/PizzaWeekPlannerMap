import { describe, it, expect } from 'vitest';
import { CreateInviteSchema } from '@/lib/validation/invite-schema';

describe('CreateInviteSchema', () => {
  it('accepts a valid email', () => {
    const result = CreateInviteSchema.safeParse({ email: 'friend@example.com' });
    expect(result.success).toBe(true);
  });

  it('trims and lowercases email', () => {
    const result = CreateInviteSchema.safeParse({
      email: '  Friend@Example.COM  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('friend@example.com');
    }
  });

  it('rejects invalid email format', () => {
    expect(
      CreateInviteSchema.safeParse({ email: 'not-valid' }).success,
    ).toBe(false);
  });

  it('rejects missing email', () => {
    expect(CreateInviteSchema.safeParse({}).success).toBe(false);
  });
});
