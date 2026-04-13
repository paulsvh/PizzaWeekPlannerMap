import { verifySessionOrNull } from '@/lib/auth/dal';
import {
  getUserLocation,
  setUserLocation,
  deleteUserLocation,
} from '@/lib/firebase/user-locations';
import { UserLocationSchema } from '@/lib/validation/user-location-schema';

/**
 * /api/user-location Route Handler.
 *
 *   GET    → returns { location: UserLocation | null }
 *   POST   → body validated with Zod, upserts the user's home location
 *   DELETE → clears the user's home location
 *
 * Uses the Node.js runtime for firebase-admin.
 */

export const runtime = 'nodejs';

export async function GET(): Promise<Response> {
  const session = await verifySessionOrNull();
  if (!session) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const location = await getUserLocation(session.userId);
  return Response.json({ location });
}

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

  const parsed = UserLocationSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid location data', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const location = await setUserLocation(session.userId, parsed.data);
    return Response.json({ location });
  } catch (err) {
    console.error('[api/user-location] save failed:', err);
    return Response.json(
      { error: 'Could not save location. Please try again.' },
      { status: 500 },
    );
  }
}

export async function DELETE(): Promise<Response> {
  const session = await verifySessionOrNull();
  if (!session) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    await deleteUserLocation(session.userId);
    return Response.json({ deleted: true });
  } catch (err) {
    console.error('[api/user-location] delete failed:', err);
    return Response.json(
      { error: 'Could not delete location. Please try again.' },
      { status: 500 },
    );
  }
}
