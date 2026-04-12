import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firebase/admin';
import { timestampToMillis, isNumberArray } from '@/lib/utils';
import type { Route } from '@/lib/types';

/**
 * Route Firestore helpers.
 *
 * Persistence model (from the plan): one doc per saved route in the
 * `routes` collection. Routes store ONLY derived data (ordered stop
 * ids, encoded polyline, total distance/duration) — never the raw
 * Directions API response, both for size and to respect Google's
 * caching restrictions.
 */

function normalizeRoute(id: string, d: Record<string, unknown>): Route {
  return {
    id,
    creatorUserId: (d.creatorUserId as string) ?? '',
    creatorDisplayName: (d.creatorDisplayName as string) ?? '',
    name: (d.name as string | null) ?? null,
    stopRestaurantIds: Array.isArray(d.stopRestaurantIds)
      ? (d.stopRestaurantIds as string[])
      : [],
    originLat: typeof d.originLat === 'number' ? d.originLat : 0,
    originLng: typeof d.originLng === 'number' ? d.originLng : 0,
    totalDistanceMeters:
      typeof d.totalDistanceMeters === 'number' ? d.totalDistanceMeters : 0,
    totalDurationSeconds:
      typeof d.totalDurationSeconds === 'number' ? d.totalDurationSeconds : 0,
    encodedPolyline: (d.encodedPolyline as string) ?? '',
    travelMode: 'BICYCLING',
    voteCount: typeof d.voteCount === 'number' ? d.voteCount : 0,
    createdAt: timestampToMillis(d.createdAt),
    // Nullable: routes saved before the leg-distance rollout will
    // not have these fields. The detail page renders them only when
    // present.
    legDistancesMeters: isNumberArray(d.legDistancesMeters)
      ? d.legDistancesMeters
      : null,
    legDurationsSeconds: isNumberArray(d.legDurationsSeconds)
      ? d.legDurationsSeconds
      : null,
  };
}

type SaveRouteInput = {
  creatorUserId: string;
  creatorDisplayName: string;
  stopRestaurantIds: string[];
  originLat: number;
  originLng: number;
  encodedPolyline: string;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  legDistancesMeters: number[];
  legDurationsSeconds: number[];
};

/**
 * Writes a new route document and returns its generated Firestore id.
 * Caller is responsible for having already validated the input shape.
 */
export async function saveRoute(input: SaveRouteInput): Promise<string> {
  const db = getDb();
  const ref = db.collection('routes').doc();
  await ref.set({
    ...input,
    name: null,
    travelMode: 'BICYCLING',
    voteCount: 0,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function getRouteById(routeId: string): Promise<Route | null> {
  const db = getDb();
  const snap = await db.collection('routes').doc(routeId).get();
  if (!snap.exists) return null;
  return normalizeRoute(snap.id, snap.data()!);
}

/**
 * Fetch all routes, sorted by either recency or vote count. Sorting
 * is server-side so the routes list page can drive it from a URL
 * search param without re-fetching client-side.
 */
export async function getAllRoutes(
  sortBy: 'recent' | 'votes' = 'recent',
): Promise<Route[]> {
  const db = getDb();
  const orderField = sortBy === 'votes' ? 'voteCount' : 'createdAt';
  const snap = await db
    .collection('routes')
    .orderBy(orderField, 'desc')
    .get();
  return snap.docs.map((doc) => normalizeRoute(doc.id, doc.data()));
}

/**
 * Hard-delete a route doc. Caller is responsible for cleanup of
 * dependent docs (votes) — see deleteAllVotesForRoute in
 * lib/firebase/votes.ts. Caller is also responsible for verifying
 * that the requester is the creator (or an admin).
 */
export async function deleteRouteById(routeId: string): Promise<void> {
  const db = getDb();
  await db.collection('routes').doc(routeId).delete();
}

type UpdateRouteInput = {
  stopRestaurantIds: string[];
  originLat: number;
  originLng: number;
  encodedPolyline: string;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  legDistancesMeters: number[];
  legDurationsSeconds: number[];
};

/**
 * Update a route's editable fields. Does NOT touch creator info,
 * voteCount, or createdAt — only the geometry/stops/leg data that
 * the user can change via the editor. Caller is responsible for
 * verifying creator-or-admin permission before calling.
 */
export async function updateRoute(
  routeId: string,
  input: UpdateRouteInput,
): Promise<void> {
  const db = getDb();
  await db.collection('routes').doc(routeId).update({
    stopRestaurantIds: input.stopRestaurantIds,
    originLat: input.originLat,
    originLng: input.originLng,
    encodedPolyline: input.encodedPolyline,
    totalDistanceMeters: input.totalDistanceMeters,
    totalDurationSeconds: input.totalDurationSeconds,
    legDistancesMeters: input.legDistancesMeters,
    legDurationsSeconds: input.legDurationsSeconds,
    updatedAt: FieldValue.serverTimestamp(),
  });
}
