import 'server-only';
import { getDb } from '@/lib/firebase/admin';
import type { Restaurant } from '@/lib/types';

/**
 * Restaurant Firestore read helpers.
 *
 * Server-side only. Called from Server Components; results are
 * serialized and passed down to client components as props. We strip
 * the Firestore `createdAt` timestamp because it doesn't serialize
 * across the server/client boundary cleanly and isn't used client-side.
 */

function normalize(id: string, data: Record<string, unknown>): Restaurant {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { createdAt: _ignored, ...rest } = data;
  return { ...(rest as Omit<Restaurant, 'id'>), id };
}

export async function getAllRestaurants(): Promise<Restaurant[]> {
  const db = getDb();
  const snap = await db.collection('restaurants').orderBy('name').get();
  return snap.docs.map((doc) => normalize(doc.id, doc.data()));
}

/**
 * Fetches a specific set of restaurants by doc ID, preserving the
 * caller's order. Used by the route detail page to hydrate a
 * stopRestaurantIds[] array into full Restaurant records.
 *
 * Firestore `in` queries are capped at 30 items (2024). Our route
 * waypoint cap is 23 so we're always safely under. For larger sets
 * this would need to be batched.
 */
export async function getRestaurantsByIds(
  ids: string[],
): Promise<Restaurant[]> {
  if (ids.length === 0) return [];

  const db = getDb();
  const refs = ids.map((id) => db.collection('restaurants').doc(id));
  const snaps = await db.getAll(...refs);

  // Build a map keyed by doc id, then return in the caller's order so
  // route stop ordering is preserved.
  const byId = new Map<string, Restaurant>();
  for (const snap of snaps) {
    if (snap.exists) {
      byId.set(snap.id, normalize(snap.id, snap.data()!));
    }
  }
  return ids
    .map((id) => byId.get(id))
    .filter((r): r is Restaurant => Boolean(r));
}
