'use server';

import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/auth/dal';
import { getRouteById, deleteRouteById } from '@/lib/firebase/routes';
import { deleteAllVotesForRoute } from '@/lib/firebase/votes';

/**
 * Delete a route. Only the creator (or an admin) can delete.
 *
 * After deleting the route doc, also cleans up any vote docs that
 * referenced it so we don't leave orphaned data in Firestore.
 *
 * Silently no-ops on permission failure to avoid leaking ownership
 * info — though in practice the Delete button is only rendered for
 * the creator and admins, so this is just defense in depth.
 */
export async function deleteRouteAction(formData: FormData): Promise<void> {
  const session = await verifySession();

  const routeId = formData.get('routeId');
  if (typeof routeId !== 'string' || routeId.length === 0) {
    return;
  }

  const route = await getRouteById(routeId);
  if (!route) {
    redirect('/routes');
  }

  const isCreator = route.creatorUserId === session.userId;
  const isAdmin = session.role === 'admin';
  if (!isCreator && !isAdmin) {
    // Silent permission failure.
    return;
  }

  await deleteRouteById(routeId);
  await deleteAllVotesForRoute(routeId);

  redirect('/routes');
}
