import 'server-only';
import { getDb } from '@/lib/firebase/admin';
import type { Restaurant } from '@/lib/types';

/**
 * Fetches every restaurant document from Firestore, ordered by name.
 *
 * Server-side only. Called from Server Components; the result is
 * serialized and passed down to the client MapView as a prop. We strip
 * the Firestore `createdAt` timestamp because it doesn't serialize
 * across the server/client boundary cleanly and isn't used client-side.
 */
export async function getAllRestaurants(): Promise<Restaurant[]> {
  const db = getDb();
  const snap = await db.collection('restaurants').orderBy('name').get();

  return snap.docs.map((doc) => {
    const data = doc.data();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { createdAt: _ignored, ...rest } = data;
    return { ...(rest as Omit<Restaurant, 'id'>), id: doc.id };
  });
}
