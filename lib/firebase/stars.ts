import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firebase/admin';

/**
 * Star Firestore helpers.
 *
 * Stars are keyed by a composite doc ID — `${userId}_${restaurantId}`
 * — which gives us two things for free:
 *
 *   1. Uniqueness: impossible to accidentally create two star docs
 *      for the same user+restaurant pair. The "free idempotency on
 *      toggle" from the original plan.
 *   2. O(1) toggle: no index query needed, just doc.get() by ID.
 *
 * The toggle runs in a Firestore transaction so concurrent toggles
 * (e.g. user double-taps, or the same user from two devices) can't
 * race into an inconsistent state.
 */

function starDocId(userId: string, restaurantId: string): string {
  return `${userId}_${restaurantId}`;
}

/**
 * Returns the list of restaurant IDs the given user has starred.
 * Used by the map page's Server Component to seed StarsProvider.
 */
export async function getStarredRestaurantIds(
  userId: string,
): Promise<string[]> {
  const db = getDb();
  const snap = await db
    .collection('stars')
    .where('userId', '==', userId)
    .get();
  return snap.docs.map((doc) => doc.data().restaurantId as string);
}

/**
 * Toggles a star for (userId, restaurantId). Returns the resulting
 * state ({ starred: true } means the star was just created).
 * Atomic via Firestore transaction — safe for concurrent calls.
 */
export async function toggleStar(
  userId: string,
  restaurantId: string,
): Promise<{ starred: boolean }> {
  const db = getDb();
  const ref = db.collection('stars').doc(starDocId(userId, restaurantId));

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      tx.delete(ref);
      return { starred: false };
    }
    tx.set(ref, {
      userId,
      restaurantId,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { starred: true };
  });
}
