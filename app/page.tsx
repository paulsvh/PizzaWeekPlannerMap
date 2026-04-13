import { verifySession } from '@/lib/auth/dal';
import { getAllRestaurants } from '@/lib/firebase/restaurants';
import { getStarredRestaurantIds } from '@/lib/firebase/stars';
import { getUserLocation } from '@/lib/firebase/user-locations';
import { MapView } from '@/components/map/MapView';

/**
 * Home page — the full-screen interactive map of Pizza Week restaurants.
 *
 * Runs server-side: verifies the session, fetches all restaurants +
 * the current user's stars + home location in parallel via the Admin
 * SDK, and hands them to the client <MapView> as props.
 *
 * No client-side Firebase: the MapView receives fully hydrated data
 * as props. The only client network traffic from this page is the
 * Maps JS API itself and the /api/stars toggle POSTs.
 */
export default async function HomePage() {
  const session = await verifySession();

  const [restaurants, starredIds, userLocation] = await Promise.all([
    getAllRestaurants(),
    getStarredRestaurantIds(session.userId),
    getUserLocation(session.userId),
  ]);

  return (
    <MapView
      restaurants={restaurants}
      displayName={session.displayName}
      mapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ?? ''}
      initialStarredIds={starredIds}
      isAdmin={session.role === 'admin'}
      initialUserLocation={userLocation}
    />
  );
}
