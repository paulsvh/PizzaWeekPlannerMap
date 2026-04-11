import 'server-only';
import { hash, verify } from '@node-rs/argon2';

/**
 * Password hashing + verification using argon2id — the current
 * OWASP-recommended password hash.
 *
 * @node-rs/argon2 is a native Rust implementation with prebuilt
 * binaries for Windows/Mac/Linux, so there's no compilation step on
 * `npm install`. argon2id is the library's default algorithm so we
 * omit the `algorithm` option (also avoids the const-enum issue
 * under TypeScript's isolatedModules).
 *
 * Tuning:
 *   - memoryCost: 19456 KiB (~19 MiB) — OWASP 2024 minimum
 *   - timeCost: 2 iterations
 *   - parallelism: 1
 *
 * These parameters target ~50-100ms per hash on modern hardware,
 * which is the sweet spot for login UX vs brute-force resistance.
 */

const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(plaintext: string): Promise<string> {
  return hash(plaintext, ARGON2_OPTIONS);
}

export async function verifyPassword(
  plaintext: string,
  hashed: string,
): Promise<boolean> {
  try {
    return await verify(hashed, plaintext, ARGON2_OPTIONS);
  } catch {
    // Malformed hash, wrong algorithm, etc. — treat as auth failure.
    return false;
  }
}

/**
 * Minimal password policy. We only enforce a length floor; no
 * character-class requirements (which hurt UX more than they help).
 */
export function validatePasswordPolicy(plaintext: string): string | null {
  if (plaintext.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (plaintext.length > 200) {
    return 'Password is too long (max 200 characters).';
  }
  return null;
}
