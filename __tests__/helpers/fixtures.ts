import type { SessionPayload } from '@/lib/types';

/** A standard authenticated user session. */
export const USER_SESSION: SessionPayload = {
  userId: 'user-1',
  displayName: 'Test User',
  role: 'user',
  expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
};

/** An admin session. */
export const ADMIN_SESSION: SessionPayload = {
  userId: 'admin-1',
  displayName: 'Admin User',
  role: 'admin',
  expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
};

/** A valid route POST/PATCH payload. */
export const VALID_ROUTE_PAYLOAD = {
  stopRestaurantIds: ['rest-a', 'rest-b', 'rest-c'],
  originLat: 45.5152,
  originLng: -122.6784,
  encodedPolyline: 'abc123',
  totalDistanceMeters: 5000,
  totalDurationSeconds: 1200,
  legDistancesMeters: [2500, 2500],
  legDurationsSeconds: [600, 600],
};

/** A minimal valid route with 2 stops and 1 leg. */
export const MINIMAL_ROUTE_PAYLOAD = {
  stopRestaurantIds: ['rest-a', 'rest-b'],
  originLat: 45.5152,
  originLng: -122.6784,
  encodedPolyline: 'xy',
  totalDistanceMeters: 1000,
  totalDurationSeconds: 300,
  legDistancesMeters: [1000],
  legDurationsSeconds: [300],
};

/** Sample restaurant IDs. */
export const RESTAURANT_IDS = ['rest-a', 'rest-b', 'rest-c', 'rest-d'];
