import 'server-only';
import { randomBytes, createHash } from 'node:crypto';

/**
 * Invite token utilities.
 *
 * Flow:
 *   1. Admin creates an invite → we generate a 32-byte random token,
 *      return the plaintext token (to build the URL + send email), and
 *      store only the SHA-256 hash in Firestore as the doc ID.
 *   2. Invitee clicks `/invite/{token}` → we hash the URL token and
 *      look up the invite by that hashed doc ID. O(1), no index query.
 *   3. After successful claim, we write claimedAt/claimedByUserId on
 *      the invite doc so it can't be used a second time.
 *
 * Storing the hash (not the plaintext) means even if the Firestore
 * export leaks, the tokens inside can't be used — an attacker would
 * need to guess the preimage, which is computationally infeasible
 * for a 32-byte random string.
 */

/**
 * Generate a 32-byte (256-bit) URL-safe random token. This is the
 * value that goes into the invite URL and the email.
 */
export function generateInviteToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * SHA-256 hash of a token, base64url-encoded for use as a Firestore
 * document ID. base64url is URL-safe and doesn't contain the `/`
 * character that Firestore reserves for path segments.
 */
export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('base64url');
}

/**
 * 7-day expiry from now. Short enough that abandoned invites don't
 * linger forever, long enough that friends have time to see the email
 * and click through.
 */
export const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export function computeInviteExpiry(from: number = Date.now()): number {
  return from + INVITE_EXPIRY_MS;
}

export function isInviteExpired(expiresAt: number, now: number = Date.now()): boolean {
  return expiresAt < now;
}

/**
 * Build the full invite URL that goes in the email / copy-link.
 */
export function buildInviteUrl(appUrl: string, token: string): string {
  // Trim trailing slash to avoid // in the path.
  const base = appUrl.replace(/\/+$/, '');
  return `${base}/invite/${token}`;
}
