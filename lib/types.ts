/**
 * Shared types used across server and client code.
 * These mirror the Firestore document shapes (see plan for the data model).
 *
 * The Zod schemas in scripts/restaurant-schema.ts are the source of truth
 * for Restaurant at the scraping/seeding boundary — keep the two in sync.
 */

export type Restaurant = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  neighborhood: string | null;
  pizzaName: string;
  pizzaIngredients: string;
  pizzaBackstory: string | null;
  // EverOut's "Meat or Vegetarian?" and "By the Slice or Whole Pie?"
  // fields are multi-selects — restaurants check every applicable variant,
  // so a single "Reuben" pizza can be both meat and vegetarian if they
  // offer a veg version. We model them as independent boolean tags.
  servesMeat: boolean;
  servesVegetarian: boolean;
  servesVegan: boolean;
  hasGlutenFreeOption: boolean;
  servesSlice: boolean;
  servesWholePie: boolean;
  imageUrl: string | null;
  everoutUrl: string;
  googlePlaceId: string | null;
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
