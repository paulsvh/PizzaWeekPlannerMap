import { z } from 'zod';
import { MAX_WAYPOINTS } from '@/lib/maps/constants';

/**
 * Shared Zod schemas for route POST and PATCH payloads.
 *
 * Extracted from the route handlers so they can be imported in tests
 * without pulling in server-only / Firebase / cookies dependencies.
 */

// Total stops = 1 anchor + up to MAX_WAYPOINTS middle stops.
export const MAX_STOPS = MAX_WAYPOINTS + 1;

export const RoutePayloadSchema = z
  .object({
    stopRestaurantIds: z
      .array(z.string().min(1).max(200))
      .min(2, { error: 'Need at least two stops.' })
      .max(MAX_STOPS, {
        error: `Too many stops (max ${MAX_STOPS}).`,
      }),
    originLat: z.number().gte(-90).lte(90),
    originLng: z.number().gte(-180).lte(180),
    encodedPolyline: z.string().min(1).max(20_000),
    totalDistanceMeters: z.number().gte(0).lte(10_000_000),
    totalDurationSeconds: z.number().gte(0).lte(60 * 60 * 24),
    legDistancesMeters: z
      .array(z.number().gte(0).lte(10_000_000))
      .min(1)
      .max(MAX_STOPS - 1),
    legDurationsSeconds: z
      .array(z.number().gte(0).lte(60 * 60 * 24))
      .min(1)
      .max(MAX_STOPS - 1),
  })
  .refine(
    (data) =>
      data.legDistancesMeters.length === data.stopRestaurantIds.length - 1,
    {
      error:
        'legDistancesMeters must have exactly stopRestaurantIds.length - 1 entries (linear route, no loop).',
    },
  )
  .refine(
    (data) =>
      data.legDurationsSeconds.length === data.stopRestaurantIds.length - 1,
    {
      error:
        'legDurationsSeconds must have exactly stopRestaurantIds.length - 1 entries (linear route, no loop).',
    },
  );

// PostSchema and PatchSchema are identical for this app.
export const PostSchema = RoutePayloadSchema;
export const PatchSchema = RoutePayloadSchema;
