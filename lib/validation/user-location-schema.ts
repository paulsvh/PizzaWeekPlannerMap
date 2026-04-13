import { z } from 'zod';

/**
 * Zod schema for creating/updating a user's home location.
 * Validates the POST body to /api/user-location.
 */
export const UserLocationSchema = z.object({
  label: z.string().min(1).max(100),
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  formattedAddress: z.string().min(1).max(500),
  placeId: z.string().max(300).nullable(),
});
