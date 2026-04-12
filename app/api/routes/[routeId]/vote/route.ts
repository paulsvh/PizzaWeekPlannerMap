import { verifySessionOrNull } from '@/lib/auth/dal';
import { toggleVote } from '@/lib/firebase/votes';

/**
 * /api/routes/[routeId]/vote
 *
 *   POST → toggles the current user's vote on this route in a
 *          Firestore transaction. Returns the resulting
 *          { voted, voteCount } so the client can reconcile its
 *          optimistic state with what actually landed on the server.
 *
 * Uses verifySessionOrNull so auth failures return JSON 401 instead
 * of redirecting (fetch() would otherwise follow the redirect and
 * surface /login HTML as the response body).
 */

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ routeId: string }> };

export async function POST(
  _request: Request,
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

  try {
    const result = await toggleVote(session.userId, routeId);
    return Response.json(result);
  } catch (err) {
    console.error('[api/routes/vote] toggle failed:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('not found')) {
      return Response.json({ error: 'Route not found' }, { status: 404 });
    }
    return Response.json(
      { error: 'Could not toggle vote. Please try again.' },
      { status: 500 },
    );
  }
}
