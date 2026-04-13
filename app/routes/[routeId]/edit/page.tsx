import { notFound, redirect } from 'next/navigation';
import { verifySession } from '@/lib/auth/dal';
import { getRouteById } from '@/lib/firebase/routes';
import {
  getAllRestaurants,
  getRestaurantsByIds,
} from '@/lib/firebase/restaurants';
import { getUserLocation } from '@/lib/firebase/user-locations';
import { RouteEditor } from '@/components/route-editor/RouteEditor';

type PageProps = {
  params: Promise<{ routeId: string }>;
};

/**
 * Route editor page — `/routes/[routeId]/edit`.
 *
 * Server Component that verifies creator-or-admin permission,
 * fetches the route + hydrated stops + full restaurant catalogue,
 * and renders the `<RouteEditor>` client component.
 *
 * Non-creators / non-admins are redirected back to the read-only
 * detail page. Missing routes → 404.
 */
export default async function RouteEditPage({ params }: PageProps) {
  const { routeId } = await params;
  const session = await verifySession();
  const route = await getRouteById(routeId);
  if (!route) {
    notFound();
  }

  const isCreator = route.creatorUserId === session.userId;
  const isAdmin = session.role === 'admin';
  if (!isCreator && !isAdmin) {
    redirect(`/routes/${routeId}`);
  }

  const [stops, allRestaurants, userLocation] = await Promise.all([
    getRestaurantsByIds(route.stopRestaurantIds),
    getAllRestaurants(),
    getUserLocation(session.userId),
  ]);

  return (
    <RouteEditor
      routeId={route.id}
      creatorDisplayName={route.creatorDisplayName}
      savedStops={stops}
      allRestaurants={allRestaurants}
      mapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ?? ''}
      savedDistanceMeters={route.totalDistanceMeters}
      savedDurationSeconds={route.totalDurationSeconds}
      userLocation={userLocation}
    />
  );
}
