import { vi } from 'vitest';

/**
 * Mock for `next/headers` cookies(), `next/navigation` redirect/notFound,
 * and `next/cache` revalidatePath.
 *
 * Import this file in integration tests that test server actions or
 * route handlers that use these Next.js APIs.
 */

// ---------- cookies() ----------

const cookieStore = new Map<string, string>();

export const mockCookies = {
  get(name: string) {
    return cookieStore.has(name)
      ? { name, value: cookieStore.get(name)! }
      : undefined;
  },
  set(name: string, value: string, _opts?: Record<string, unknown>) {
    cookieStore.set(name, value);
  },
  delete(name: string) {
    cookieStore.delete(name);
  },
  /** Clear all cookies between tests. */
  clear() {
    cookieStore.clear();
  },
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => mockCookies),
}));

// ---------- redirect / notFound ----------

export class RedirectError extends Error {
  readonly url: string;
  constructor(url: string) {
    super(`NEXT_REDIRECT: ${url}`);
    this.name = 'RedirectError';
    this.url = url;
  }
}

export class NotFoundError extends Error {
  constructor() {
    super('NEXT_NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new RedirectError(url);
  }),
  notFound: vi.fn(() => {
    throw new NotFoundError();
  }),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  })),
}));

// ---------- revalidatePath ----------

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));
