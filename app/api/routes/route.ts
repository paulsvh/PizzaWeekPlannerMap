import { verifySessionOrNull } from '@/lib/auth/dal';
import { saveRoute } from '@/lib/firebase/routes';
import { PostSchema } from '@/lib/validation/route-schemas';

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
