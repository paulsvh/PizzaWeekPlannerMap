import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firebase/admin';

/**
 * Vote Firestore helpers.
 *
 * Same composite-doc-id pattern as `stars`: each vote doc lives at
 * `votes/${userId}_${routeId}` so toggle is idempotent and we never
 * have two vote docs for the same (user, route) pair. The route's
 * `voteCount` is denormalized so the routes list and detail pages
 * can render counts without an aggregate query.
 */

function voteDocId(userId: string, routeId: string): string {
  return `${userId}_${routeId}`;
}

/**
 * Toggles a vote for (userId, routeId) atomically and returns the
 * resulting state. Uses a Firestore transaction so the vote doc and
 * the route's denormalized voteCount field stay consistent under
 * concurrent toggles (e.g. user double-tapping or voting from two
 * devices).
 *
 * Throws if the route doesn't exist — surfaces as a 500 in the
 * Route Handler so the client knows something went wrong.
 */
export async function toggleVote(
  userId: string,
  routeId: string,
): Promise<{ voted: boolean; voteCount: number }> {
  const db = getDb();
  const voteRef = db.collection('votes').doc(voteDocId(userId, routeId));
  const routeRef = db.collection('routes').doc(routeId);

  return db.runTransaction(async (tx) => {
    const [voteSnap, routeSnap] = await Promise.all([
      tx.get(voteRef),
      tx.get(routeRef),
    ]);

    if (!routeSnap.exists) {
      throw new Error(`Route ${routeId} not found`);
    }

    const currentCount =
      typeof routeSnap.data()?.voteCount === 'number'
        ? (routeSnap.data()!.voteCount as number)
        : 0;

    if (voteSnap.exists) {
      // Already voted → remove the vote, decrement the count.
      tx.delete(voteRef);
      const nextCount = Math.max(0, currentCount - 1);
      tx.update(routeRef, { voteCount: nextCount });
      return { voted: false, voteCount: nextCount };
    }

    // Not yet voted → create the vote doc, increment the count.
    tx.set(voteRef, {
      userId,
      routeId,
      createdAt: FieldValue.serverTimestamp(),
    });
    const nextCount = currentCount + 1;
    tx.update(routeRef, { voteCount: nextCount });
    return { voted: true, voteCount: nextCount };
  });
}

/**
 * Returns true if the user has voted on the given route. O(1) doc
 * get — used by the detail page to seed the VoteButton's initial
 * state.
 */
export async function getUserVote(
  userId: string,
  routeId: string,
): Promise<boolean> {
  const db = getDb();
  const snap = await db
    .collection('votes')
    .doc(voteDocId(userId, routeId))
    .get();
  return snap.exists;
}

/**
 * Returns the set of all routeIds the user has voted on. Single
 * Firestore query — used by the routes list page to render a
 * "✓ VOTED" indicator on each card without N+1 lookups.
 */
export async function getUserVotedRouteIds(
  userId: string,
): Promise<Set<string>> {
  const db = getDb();
  const snap = await db
    .collection('votes')
    .where('userId', '==', userId)
    .get();
  return new Set(
    snap.docs
      .map((doc) => doc.data().routeId)
      .filter((id): id is string => typeof id === 'string'),
  );
}

/**
 * Hard-deletes all vote docs for a given route. Called as cleanup
 * when a route is deleted so we don't leak orphaned vote docs.
 *
 * For our scale (a handful of friends, max ~50 votes per route)
 * this is well within Firestore's batch-write limit of 500 ops.
 */
export async function deleteAllVotesForRoute(routeId: string): Promise<void> {
  const db = getDb();
  const snap = await db
    .collection('votes')
    .where('routeId', '==', routeId)
    .get();

  if (snap.empty) return;

  const batch = db.batch();
  for (const doc of snap.docs) {
    batch.delete(doc.ref);
  }
  await batch.commit();
}
