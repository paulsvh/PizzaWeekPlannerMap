/**
 * Shared types used across server and client code.
 * These mirror the Firestore document shapes (see plan for the data model).
 */

export type Restaurant = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  pizzaName: string;
  pizzaDescription: string;
  price: number;
  imageUrl: string | null;
  sourceUrl: string;
};

export type User = {
  id: string;
  displayName: string;
};

export type SessionPayload = {
  userId: string;
  displayName: string;
  // jose sets iat/exp automatically, but we include expiresAt for cookie expiry sync
  expiresAt: number;
};

export type Star = {
  userId: string;
  restaurantId: string;
  createdAt: number;
};

export type Route = {
  id: string;
  creatorUserId: string;
  creatorDisplayName: string;
  name: string | null;
  stopRestaurantIds: string[];
  originLat: number;
  originLng: number;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  encodedPolyline: string;
  travelMode: 'BICYCLING';
  voteCount: number;
  createdAt: number;
};
