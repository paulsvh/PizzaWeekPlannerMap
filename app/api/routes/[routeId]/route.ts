import { verifySessionOrNull } from '@/lib/auth/dal';
import { getRouteById, updateRoute } from '@/lib/firebase/routes';
import { PatchSchema } from '@/lib/validation/route-schemas';

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
