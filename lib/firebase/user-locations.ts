import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import { getDb } from '@/lib/firebase/admin';
import type { UserLocation } from '@/lib/types';

/**
 * User location Firestore helpers.
 *
 * Each user has at most one saved location (their "home"). The doc ID
 * is simply the userId — no composite key needed since there's a 1:1
 * relationship. This follows the same O(1) doc.get() pattern as stars
 * and votes.
 */

const COLLECTION = 'userLocations';

/**
 * Returns the user's saved home location, or null if they haven't set one.
 */
export async function getUserLocation(
  userId: string,
): Promise<UserLocation | null> {
  const db = getDb();
  const snap = await db.collection(COLLECTION).doc(userId).get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  return {
    userId: data.userId as string,
    label: data.label as string,
    lat: data.lat as number,
    lng: data.lng as number,
    formattedAddress: data.formattedAddress as string,
    placeId: (data.placeId as string) ?? null,
    updatedAt:
      data.updatedAt?.toMillis?.() ?? (data.updatedAt as number) ?? Date.now(),
  };
}

/**
 * Creates or overwrites the user's saved location.
 */
export async function setUserLocation(
  userId: string,
  input: {
    label: string;
    lat: number;
    lng: number;
    formattedAddress: string;
    placeId: string | null;
  },
): Promise<UserLocation> {
  const db = getDb();
  const ref = db.collection(COLLECTION).doc(userId);
  const now = Date.now();
  const doc = {
    userId,
    label: input.label,
    lat: input.lat,
    lng: input.lng,
    formattedAddress: input.formattedAddress,
    placeId: input.placeId,
    updatedAt: FieldValue.serverTimestamp(),
  };
  await ref.set(doc);
  return { ...doc, updatedAt: now } as UserLocation;
}

/**
 * Deletes the user's saved location.
 */
export async function deleteUserLocation(userId: string): Promise<void> {
  const db = getDb();
  await db.collection(COLLECTION).doc(userId).delete();
}
