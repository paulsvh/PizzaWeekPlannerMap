import { z } from 'zod';
import { verifySessionOrNull } from '@/lib/auth/dal';
import { getRouteById, updateRoute } from '@/lib/firebase/routes';
import { MAX_WAYPOINTS } from '@/lib/maps/constants';

/**
 * /api/routes/[routeId]
 *
 *   PATCH → updates the editable fields of a route. Body shape is
 *           the same as POST /api/routes. Only the route's creator
 *           (or an admin) can update.
 *
 * Uses verifySessionOrNull so auth failures return JSON 401 instead
 * of redirecting; the editor's fetch() callers would otherwise
 * silently follow the redirect to /login HTML.
 *
 * Node runtime so firebase-admin can load.
 */

export const runtime = 'nodejs';

const MAX_STOPS = MAX_WAYPOINTS + 1;

const PatchSchema = z
  .object({
    stopRestaurantIds: z
      .array(z.string().min(1).max(200))
      .min(2, { error: 'Need at least two stops.' })
      .max(MAX_STOPS, { error: `Too many stops (max ${MAX_STOPS}).` }),
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

type RouteContext = { params: Promise<{ routeId: string }> };

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const session = await verifySessionOrNull();
  if (!session) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { routeId } = await context.params;
  if (!routeId) {
    return Response.json({ error: 'Missing routeId' }, { status: 400 });
  }

  const route = await getRouteById(routeId);
  if (!route) {
    return Response.json({ error: 'Route not found' }, { status: 404 });
  }

  // Only the creator (or an admin) can edit a route.
  const isCreator = route.creatorUserId === session.userId;
  const isAdmin = session.role === 'admin';
  if (!isCreator && !isAdmin) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(raw);
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
    await updateRoute(routeId, parsed.data);
    return Response.json({ routeId });
  } catch (err) {
    console.error('[api/routes/PATCH] update failed:', err);
    return Response.json(
      { error: 'Could not update the route. Please try again.' },
      { status: 500 },
    );
  }
}
