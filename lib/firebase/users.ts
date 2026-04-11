import 'server-only';
import { getDb } from '@/lib/firebase/admin';
import type { User } from '@/lib/types';

/**
 * User Firestore read helpers.
 *
 * All timestamps are normalized to millis at the server boundary so
 * the shape is safe to pass across the server/client component split
 * as a plain prop (Firestore Timestamp objects don't serialize).
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

function normalizeUser(id: string, d: Record<string, unknown>): User {
  return {
    id,
    email: (d.email as string) ?? '',
    displayName: (d.displayName as string) ?? '',
    role: d.role === 'admin' ? 'admin' : 'user',
    createdAt: timestampToMillis(d.createdAt) ?? 0,
    claimedAt: timestampToMillis(d.claimedAt),
    lastLoginAt: timestampToMillis(d.lastLoginAt),
  };
}

export async function getAllUsers(): Promise<User[]> {
  const db = getDb();
  const snap = await db.collection('users').orderBy('createdAt', 'desc').get();
  return snap.docs.map((doc) => normalizeUser(doc.id, doc.data()));
}
