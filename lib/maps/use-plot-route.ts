'use client';

import { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import type { Restaurant } from '@/lib/types';

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
 *   too-many      → Google caps waypoints at MAX_WAYPOINTS
 *   needs-origin  → waiting for geolocation or fallback
 *   computing     → directions request in flight (debounced ~350ms)
 *   ready         → result is populated
 *   error         → directions API returned a non-OK status
 *
 * Debouncing + stale-response cancellation: every request bumps a
 * ref counter. When the callback fires, it compares its ID to the
 * current one and drops the result if they differ. Protects against
 * rapid star-toggle races.
 */

// Google Directions API allows up to 25 waypoints (plus origin and
// destination) on the standard plan. Leave a little headroom — 23 is
// a safe cap.
export const MAX_WAYPOINTS = 23;

const DEBOUNCE_MS = 350;

export type PlotStatus =
  | 'idle'
  | 'loading'
  | 'too-few'
  | 'too-many'
  | 'needs-origin'
  | 'computing'
  | 'ready'
  | 'error';

export type PlotResult = {
  /** Starred restaurants in the order Google's optimizer returned. */
  orderedStops: Restaurant[];
  /** LatLng array for rendering the polyline on the map. */
  path: google.maps.LatLngLiteral[];
  /** Encoded polyline string — used by Phase 6 for persistence. */
  encodedPolyline: string;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  /** Origin used for the computation (echoed back for display). */
  origin: google.maps.LatLngLiteral;
};

type UsePlotRouteInput = {
  enabled: boolean;
  origin: google.maps.LatLngLiteral | null;
  waypoints: Restaurant[];
  /**
   * When true (default), Google reorders the waypoints for the
   * shortest biking route and returns the order in `waypoint_order`.
   * When false, Google respects the order of `waypoints` exactly and
   * returns leg distances/durations for that sequence.
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
  origin,
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

    if (waypoints.length > MAX_WAYPOINTS) {
      setStatus('too-many');
      setResult(null);
      setError(null);
      return;
    }

    if (!routesLib) {
      setStatus('loading');
      return;
    }

    if (!origin) {
      setStatus('needs-origin');
      return;
    }

    setStatus('computing');
    const myRequestId = ++latestRequestRef.current;

    const timer = setTimeout(() => {
      const service = new routesLib.DirectionsService();

      service.route(
        {
          origin,
          destination: origin, // loop back
          waypoints: waypoints.map((w) => ({
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

          // When we asked Google to optimize, it returns the new order
          // in `waypoint_order`. When we asked it to respect our order,
          // we display the waypoints as-passed and trust Google to echo
          // back the same order (it does, but we don't rely on it).
          const orderedStops = optimize
            ? (route.waypoint_order ?? [])
                .map((i) => waypoints[i])
                .filter((r): r is Restaurant => Boolean(r))
            : waypoints.slice();

          // Sum all leg distances and durations.
          const totalDistanceMeters = route.legs.reduce(
            (sum, leg) => sum + (leg.distance?.value ?? 0),
            0,
          );
          const totalDurationSeconds = route.legs.reduce(
            (sum, leg) => sum + (leg.duration?.value ?? 0),
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
            origin,
          });
          setStatus('ready');
          setError(null);
        },
      );
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [enabled, origin, waypoints, routesLib]);

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
