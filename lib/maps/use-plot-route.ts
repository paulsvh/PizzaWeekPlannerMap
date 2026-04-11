'use client';

import { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import type { Restaurant } from '@/lib/types';
import { MAX_WAYPOINTS } from '@/lib/maps/constants';

/**
 * usePlotRoute — the brain of plot mode.
 *
 * Given the current starred restaurants and an origin (user's GPS or
 * fallback), calls the Google Directions Service with
 * `optimizeWaypoints: true` + `travelMode: BICYCLING` and produces a
 * polyline path + total distance/duration + the stops reordered by
 * Google's optimizer. The route loops back to the origin (best UX
 * for a pizza crawl — you start and end at the same place).
 *
 * State machine:
 *
 *   idle          → plot mode is off
 *   loading       → routes library is loading
 *   too-few       → need at least 2 starred restaurants
 *   too-many      → more than MAX_WAYPOINTS middle stops after the anchor
 *   computing     → directions request in flight (debounced ~350ms)
 *   ready         → result is populated
 *   error         → directions API returned a non-OK status
 *
 * Debouncing + stale-response cancellation: every request bumps a
 * ref counter. When the callback fires, it compares its ID to the
 * current one and drops the result if they differ. Protects against
 * rapid star-toggle races.
 */

// Re-exported from the shared constants module so existing client
// callers (PlotModeSheet) don't need to change their import path.
// The value lives in lib/maps/constants.ts so Server Components and
// Route Handlers can import it without hitting the RSC client-
// reference boundary.
export { MAX_WAYPOINTS } from '@/lib/maps/constants';

const DEBOUNCE_MS = 350;

export type PlotStatus =
  | 'idle'
  | 'loading'
  | 'too-few'
  | 'too-many'
  | 'computing'
  | 'ready'
  | 'error';

export type PlotResult = {
  /**
   * All stops in final order, with orderedStops[0] being the anchor
   * (the first restaurant in the user's list). The route is:
   * orderedStops[0] → orderedStops[1] → ... → orderedStops[N-1] →
   * orderedStops[0] (loop back).
   */
  orderedStops: Restaurant[];
  /** LatLng array for rendering the polyline on the map. */
  path: google.maps.LatLngLiteral[];
  /** Encoded polyline string — used by Phase 6 for persistence. */
  encodedPolyline: string;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  /**
   * Per-leg distances in meters. Length === orderedStops.length.
   * legs[0] = stop0→stop1, legs[1] = stop1→stop2, ...,
   * legs[N-1] = stopN-1→stop0 (the return leg that closes the loop).
   */
  legDistancesMeters: number[];
  /** Per-leg durations in seconds, same length as legDistancesMeters. */
  legDurationsSeconds: number[];
  /** Anchor LatLng (always equals orderedStops[0]'s coords). */
  origin: google.maps.LatLngLiteral;
};

type UsePlotRouteInput = {
  enabled: boolean;
  /**
   * The full list of stops to plot. CONVENTION: `waypoints[0]` is the
   * anchor — the route starts there, visits the rest (optionally
   * reordered by Google when `optimize` is true), and loops back to
   * `waypoints[0]`. The hook never reorders the anchor.
   */
  waypoints: Restaurant[];
  /**
   * When true, Google reorders the MIDDLE stops (everything except
   * `waypoints[0]`) for the shortest biking route. The anchor stays
   * fixed. When false, Google respects the order exactly.
   */
  optimize: boolean;
};

type UsePlotRouteOutput = {
  status: PlotStatus;
  result: PlotResult | null;
  error: string | null;
};

export function usePlotRoute({
  enabled,
  waypoints,
  optimize,
}: UsePlotRouteInput): UsePlotRouteOutput {
  const routesLib = useMapsLibrary('routes');
  const [status, setStatus] = useState<PlotStatus>('idle');
  const [result, setResult] = useState<PlotResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latestRequestRef = useRef(0);

  useEffect(() => {
    // Disabled → clear everything.
    if (!enabled) {
      setStatus('idle');
      setResult(null);
      setError(null);
      return;
    }

    if (waypoints.length < 2) {
      setStatus('too-few');
      setResult(null);
      setError(null);
      return;
    }

    // The first stop is the anchor; the rest go to the Directions
    // API as "middle" waypoints. Google's waypoint cap applies to
    // that middle section, which is why we allow one more total stop
    // than MAX_WAYPOINTS (the anchor doesn't count).
    const anchor = waypoints[0];
    const middleStops = waypoints.slice(1);

    if (middleStops.length > MAX_WAYPOINTS) {
      setStatus('too-many');
      setResult(null);
      setError(null);
      return;
    }

    if (!routesLib) {
      setStatus('loading');
      return;
    }

    setStatus('computing');
    const myRequestId = ++latestRequestRef.current;

    const timer = setTimeout(() => {
      const service = new routesLib.DirectionsService();
      const anchorLatLng: google.maps.LatLngLiteral = {
        lat: anchor.lat,
        lng: anchor.lng,
      };

      service.route(
        {
          origin: anchorLatLng,
          destination: anchorLatLng, // loop back to the anchor
          waypoints: middleStops.map((w) => ({
            location: { lat: w.lat, lng: w.lng },
            stopover: true,
          })),
          optimizeWaypoints: optimize,
          travelMode: 'BICYCLING' as google.maps.TravelMode,
        },
        (response, requestStatus) => {
          // Stale response — the user has already triggered another
          // recompute (e.g. by reordering stops). Drop this result.
          if (myRequestId !== latestRequestRef.current) return;

          if (requestStatus !== 'OK' || !response) {
            setStatus('error');
            // Keep the previous `result` around so the UI can still
            // show the last-known stops while the user is fixing the
            // error — we only clear on explicit state changes, not on
            // a single failed recompute.
            setError(friendlyDirectionsError(String(requestStatus)));
            return;
          }

          const route = response.routes[0];
          if (!route) {
            setStatus('error');
            setError('Google returned no route for that set of stops.');
            return;
          }

          // Reorder the middle stops per Google's waypoint_order when
          // optimizing, or keep them as-passed when not. Then prepend
          // the fixed anchor so orderedStops starts with the first
          // user-selected stop.
          const orderedMiddle = optimize
            ? (route.waypoint_order ?? [])
                .map((i) => middleStops[i])
                .filter((r): r is Restaurant => Boolean(r))
            : middleStops.slice();
          const orderedStops = [anchor, ...orderedMiddle];

          // Legs are in route-order. For N stops (including anchor),
          // Google returns N legs: anchor→stop1, stop1→stop2, ...,
          // stopN-1→anchor. So legs.length === orderedStops.length.
          const legDistancesMeters = route.legs.map(
            (leg) => leg.distance?.value ?? 0,
          );
          const legDurationsSeconds = route.legs.map(
            (leg) => leg.duration?.value ?? 0,
          );
          const totalDistanceMeters = legDistancesMeters.reduce(
            (sum, m) => sum + m,
            0,
          );
          const totalDurationSeconds = legDurationsSeconds.reduce(
            (sum, s) => sum + s,
            0,
          );

          // Convert the overview_path (array of LatLng objects) to
          // plain LatLngLiteral for rendering and storage.
          const path = route.overview_path.map((p) => ({
            lat: p.lat(),
            lng: p.lng(),
          }));

          const encodedPolyline = route.overview_polyline ?? '';

          setResult({
            orderedStops,
            path,
            encodedPolyline,
            totalDistanceMeters,
            totalDurationSeconds,
            legDistancesMeters,
            legDurationsSeconds,
            origin: anchorLatLng,
          });
          setStatus('ready');
          setError(null);
        },
      );
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [enabled, waypoints, optimize, routesLib]);

  return { status, result, error };
}

function friendlyDirectionsError(status: string): string {
  switch (status) {
    case 'ZERO_RESULTS':
      return "Google couldn't find a biking route between these stops.";
    case 'OVER_QUERY_LIMIT':
      return 'Directions API quota exceeded. Try again in a minute.';
    case 'REQUEST_DENIED':
      return 'Directions request denied — is Directions API enabled?';
    case 'INVALID_REQUEST':
      return 'The route request was malformed.';
    default:
      return `Directions API error: ${status}`;
  }
}
