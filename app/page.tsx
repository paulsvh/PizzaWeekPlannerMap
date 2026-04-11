import { verifySession } from '@/lib/auth/dal';
import { getAllRestaurants } from '@/lib/firebase/restaurants';
import { MapView } from '@/components/map/MapView';

/**
 * Home page — the full-screen interactive map of Pizza Week restaurants.
 *
 * Runs server-side: verifies the session, fetches all restaurant docs
 * from Firestore via the Admin SDK, and hands them to the client
 * <MapView> as a prop. This avoids a client-side Firebase Web SDK
 * entirely and keeps the render path simple: one server round-trip per
 * page load, no client-side fetch, no loading spinners.
 */
export default async function HomePage() {
  const session = await verifySession();
  const restaurants = await getAllRestaurants();

  return (
    <MapView
      restaurants={restaurants}
      displayName={session.displayName}
      mapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ?? ''}
    />
  );
}
