import { z } from 'zod';
import { verifySessionOrNull } from '@/lib/auth/dal';
import { getStarredRestaurantIds, toggleStar } from '@/lib/firebase/stars';

/**
 * /api/stars Route Handler.
 *
 *   GET  → returns { starred: string[] } — list of restaurant IDs
 *          the current user has starred.
 *   POST → body { restaurantId: string }, toggles that star and
 *          returns { starred: boolean } indicating the resulting
 *          state.
 *
 * Both use verifySessionOrNull (not verifySession) so auth failures
 * return a JSON 401 instead of redirecting to /login — redirects
 * break client-side fetch() callers because fetch follows 3xx by
 * default and surfaces the redirected HTML as the response body.
 *
 * Uses the Node.js runtime explicitly so firebase-admin can load.
 */

export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  const session = await verifySessionOrNull();
  if (!session) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const starred = await getStarredRestaurantIds(session.userId);
  return Response.json({ starred });
}

const PostSchema = z.object({
  restaurantId: z.string().min(1).max(200),
});

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
    return Response.json(
      { error: 'restaurantId is required' },
      { status: 400 },
    );
  }

  try {
    const result = await toggleStar(session.userId, parsed.data.restaurantId);
    return Response.json(result);
  } catch (err) {
    console.error('[api/stars] toggle failed:', err);
    return Response.json(
      { error: 'Could not toggle star. Please try again.' },
      { status: 500 },
    );
  }
}
