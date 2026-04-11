import 'server-only';
import { getDb } from '@/lib/firebase/admin';
import { hashInviteToken } from '@/lib/auth/invites';
import type { Invite } from '@/lib/types';

/**
 * Invite Firestore read helpers.
 *
 * Invite docs are keyed by the SHA-256 hash of the plaintext token,
 * so `getInviteByToken` is an O(1) doc get (no index query).
 *
 * Timestamps are normalized to millis for client-prop safety.
 */

function timestampToMillis(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  if (
    typeof value === 'object' &&
    value !== null &&
    'toMillis' in value &&
    typeof (value as { toMillis: () => number }).toMillis === 'function'
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return null;
}

function normalizeInvite(id: string, d: Record<string, unknown>): Invite {
  return {
    id,
    email: (d.email as string) ?? '',
    createdByUserId: (d.createdByUserId as string) ?? '',
    createdByDisplayName: (d.createdByDisplayName as string) ?? '',
    createdAt: timestampToMillis(d.createdAt) ?? 0,
    expiresAt: typeof d.expiresAt === 'number' ? d.expiresAt : 0,
    claimedAt: timestampToMillis(d.claimedAt),
    claimedByUserId: (d.claimedByUserId as string) ?? null,
  };
}

export async function getAllInvites(): Promise<Invite[]> {
  const db = getDb();
  const snap = await db
    .collection('invites')
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map((doc) => normalizeInvite(doc.id, doc.data()));
}

/**
 * Look up an invite by its plaintext URL token. Hashes the token and
 * does a direct doc lookup — no query, no index needed.
 */
export async function getInviteByToken(token: string): Promise<Invite | null> {
  const db = getDb();
  const hashedId = hashInviteToken(token);
  const snap = await db.collection('invites').doc(hashedId).get();
  if (!snap.exists) return null;
  return normalizeInvite(snap.id, snap.data()!);
}
