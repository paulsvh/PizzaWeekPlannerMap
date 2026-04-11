import { z } from 'zod';
import { verifySessionOrNull } from '@/lib/auth/dal';
import { saveRoute } from '@/lib/firebase/routes';
// IMPORTANT: import from the constants module, NOT from
// use-plot-route.ts — that file is marked 'use client', and
// importing a plain value from a client module server-side wraps it
// in an RSC client reference. Calling that "value" as a function
// throws "Attempted to call MAX_WAYPOINTS from the server".
import { MAX_WAYPOINTS } from '@/lib/maps/constants';

/**
 * /api/routes Route Handler.
 *
 *   POST → body is a computed route from the plot-mode sheet.
 *          Validates, persists via saveRoute(), and returns
 *          { routeId }. The client then pushes to /routes/{id}.
 *
 * Uses verifySessionOrNull so auth failures return JSON 401 instead
 * of redirecting to /login — redirects break client-side fetch()
 * callers because fetch follows 3xx by default.
 *
 * Node runtime so firebase-admin can load.
 */

export const runtime = 'nodejs';

// Total stops = 1 anchor + up to MAX_WAYPOINTS middle stops.
const MAX_STOPS = MAX_WAYPOINTS + 1;

const PostSchema = z
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
      .min(2)
      .max(MAX_STOPS),
    legDurationsSeconds: z
      .array(z.number().gte(0).lte(60 * 60 * 24))
      .min(2)
      .max(MAX_STOPS),
  })
  .refine(
    (data) =>
      data.legDistancesMeters.length === data.stopRestaurantIds.length,
    {
      error:
        'legDistancesMeters must have exactly stopRestaurantIds.length entries (first-stop anchor loop).',
    },
  )
  .refine(
    (data) =>
      data.legDurationsSeconds.length === data.stopRestaurantIds.length,
    {
      error:
        'legDurationsSeconds must have exactly stopRestaurantIds.length entries (first-stop anchor loop).',
    },
  );

export async function POST(request: Request): Promise<Response> {
  const session = await verifySessionOrNull();
  if (!session) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = PostSchema.safeParse(raw);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors ?? {})
      .flat()
      .filter(Boolean)[0];
    return Response.json(
      { error: first ?? 'Invalid route payload' },
      { status: 400 },
    );
  }

  try {
    const routeId = await saveRoute({
      creatorUserId: session.userId,
      creatorDisplayName: session.displayName,
      ...parsed.data,
    });
    return Response.json({ routeId });
  } catch (err) {
    console.error('[api/routes] saveRoute failed:', err);
    return Response.json(
      { error: 'Could not save the route. Please try again.' },
      { status: 500 },
    );
  }
}
