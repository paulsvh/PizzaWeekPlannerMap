import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Import the real env module (server-only is mocked in setup).
// We test by manipulating process.env directly.

describe('lib/env', () => {
  const saved: Record<string, string | undefined> = {};

  function setEnv(key: string, value: string | undefined) {
    if (!(key in saved)) saved[key] = process.env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  afterEach(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('required() throws when env var is missing', async () => {
    setEnv('SESSION_SECRET', undefined);
    // Re-import to bypass any caching
    const { env } = await import('@/lib/env');
    expect(() => env.sessionSecret).toThrow('Missing required environment variable: SESSION_SECRET');
  });

  it('required() throws when env var is empty string', async () => {
    setEnv('SESSION_SECRET', '');
    const { env } = await import('@/lib/env');
    expect(() => env.sessionSecret).toThrow('Missing required environment variable: SESSION_SECRET');
  });

  it('required() returns the value when set', async () => {
    setEnv('SESSION_SECRET', 'my-secret');
    const { env } = await import('@/lib/env');
    expect(env.sessionSecret).toBe('my-secret');
  });

  it('firebasePrivateKey converts escaped \\n to real newlines', async () => {
    setEnv('FIREBASE_PRIVATE_KEY', 'line1\\nline2');
    const { env } = await import('@/lib/env');
    expect(env.firebasePrivateKey).toBe('line1\nline2');
  });

  it('optional resend vars return null when not set', async () => {
    setEnv('RESEND_API_KEY', undefined);
    setEnv('RESEND_FROM_EMAIL', undefined);
    const { env } = await import('@/lib/env');
    expect(env.resendApiKey).toBeNull();
    expect(env.resendFromEmail).toBeNull();
    expect(env.isEmailConfigured).toBe(false);
  });

  it('isEmailConfigured returns true when both resend vars set', async () => {
    setEnv('RESEND_API_KEY', 're_test');
    setEnv('RESEND_FROM_EMAIL', 'test@test.com');
    const { env } = await import('@/lib/env');
    expect(env.isEmailConfigured).toBe(true);
  });

  it('publicEnv.googleMapsBrowserKey falls back to empty string', async () => {
    setEnv('NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY', undefined);
    const { publicEnv } = await import('@/lib/env');
    expect(publicEnv.googleMapsBrowserKey).toBe('');
  });
});
