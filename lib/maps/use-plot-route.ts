'use client';

import { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import type { Restaurant } from '@/lib/types';
import { MAX_WAYPOINTS } from '@/lib/maps/constants';
import { findDiameterPair } from '@/lib/maps/geometry';

/**
 * usePlotRoute — the brain of plot mode.
 *
 * Given the current stops, calls the Google Directions Service with
 * `travelMode: BICYCLING` and produces a polyline path + total
 * distance/duration + the stops reordered by Google's optimizer.
 *
 * LINEAR route semantics: the route does not loop back. When
 * `optimize` is true, the hook picks the two geographically
 * farthest-apart stops as origin and destination ("diameter pair"),
 * then asks Google to reorder the middle stops for the shortest
 * biking route. When `optimize` is false (manual order), the first
 * and last stops in the waypoints array are used as-is.
 *
 * State machine:
 *
 *   idle          → plot mode is off
 *   loading       → routes library is loading
 *   too-few       → need at least 2 starred restaurants
 *   too-many      → more than MAX_WAYPOINTS middle stops
 *   computing     → directions request in flight (debounced ~350ms)
 *   ready         → result is populated
 *   error         ��� directions API returned a non-OK status
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
   * All stops in final order. orderedStops[0] is the starting point,
   * orderedStops[N-1] is the ending point. The route does NOT loop
   * back — everyone disperses at the last stop.
   */
  orderedStops: Restaurant[];
  /** LatLng array for rendering the polyline on the map. */
  path: google.maps.LatLngLiteral[];
  /** Encoded polyline string — persisted when saving the route. */
  encodedPolyline: string;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  /**
   * Per-leg distances in meters. Length === orderedStops.length - 1.
   * legs[0] = stop0→stop1, legs[1] = stop1→stop2, ...,
   * legs[N-2] = stopN-2→stopN-1.
   */
  legDistancesMeters: number[];
  /** Per-leg durations in seconds, same length as legDistancesMeters. */
  legDurationsSeconds: number[];
  /** Origin LatLng (always equals orderedStops[0]'s coords). */
  origin: google.maps.LatLngLiteral;
};

type UsePlotRouteInput = {
  enabled: boolean;
  /**
   * The full list of stops to plot. `waypoints[0]` is the starting
   * point (origin) and `waypoints[N-1]` is the ending point
   * (destination). When `optimize` is true, Google reorders the
   * MIDDLE stops for the shortest biking route but pins the first
   * and last. When false, the order is respected exactly.
   */
  waypoints: Restaurant[];
  /**
   * When true, Google reorders the middle stops (everything between
   * first and last) for the shortest biking route. First and last
   * stay fixed. When false, Google respects the order exactly.
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

    // Pick endpoints. When optimizing, find the two geographically
    // farthest-apart stops ("diameter pair") so the route runs
    // linearly across the cluster. When the user has set a manual
    // order, respect their first/last exactly.
    let first: Restaurant;
    let last: Restaurant;
    let middleStops: Restaurant[];

    if (optimize && waypoints.length >= 2) {
      const [startIdx, endIdx] = findDiameterPair(waypoints);
      first = waypoints[startIdx];
      last = waypoints[endIdx];
      middleStops = waypoints.filter(
        (_, i) => i !== startIdx && i !== endIdx,
      );
    } else {
      first = waypoints[0];
      last = waypoints[waypoints.length - 1];
      middleStops =
        waypoints.length > 2 ? waypoints.slice(1, -1) : [];
    }

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
      const originLatLng: google.maps.LatLngLiteral = {
        lat: first.lat,
        lng: first.lng,
      };
      const destinationLatLng: google.maps.LatLngLiteral = {
        lat: last.lat,
        lng: last.lng,
      };

      service.route(
        {
          origin: originLatLng,
          destination: destinationLatLng,
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
          // optimizing, or keep them as-passed when not. Then sandwich
          // between the fixed first and last stops.
          const orderedMiddle = optimize
            ? (route.waypoint_order ?? [])
                .map((i) => middleStops[i])
                .filter((r): r is Restaurant => Boolean(r))
            : middleStops.slice();
          const orderedStops = [first, ...orderedMiddle, last];

          // Legs: for N stops in a linear route, Google returns N-1
          // legs. legs[0] = first→stop1, ..., legs[N-2] = stopN-2→last.
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
            origin: originLatLng,
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
