import { describe, it, expect } from 'vitest';
import { LoginSchema } from '@/lib/validation/login-schema';

describe('LoginSchema', () => {
  it('accepts valid email + password', () => {
    const result = LoginSchema.safeParse({
      email: 'user@example.com',
      password: 'mypassword',
    });
    expect(result.success).toBe(true);
  });

  it('trims and lowercases email', () => {
    const result = LoginSchema.safeParse({
      email: '  User@Example.COM  ',
      password: 'pass',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
    }
  });

  it('rejects missing email', () => {
    const result = LoginSchema.safeParse({ password: 'pass' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email format', () => {
    const result = LoginSchema.safeParse({
      email: 'not-an-email',
      password: 'pass',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const result = LoginSchema.safeParse({
      email: 'user@example.com',
      password: '',
    });
    expect(result.success).toBe(false);
  });
});
