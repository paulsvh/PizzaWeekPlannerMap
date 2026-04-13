'use client';

import { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

/**
 * useCustomLegs — computes the personal travel legs from the user's
 * home to the first stop and from the last stop back home.
 *
 * Two independent single-leg Google Directions calls with travelMode
 * BICYCLING. Debounced and stale-cancelled like usePlotRoute.
 *
 * Returns null legs when homeLocation is null (not set) or when
 * first/last stop is missing. The paths are included for rendering
 * dashed polylines on the map.
 */

const DEBOUNCE_MS = 400;

export type CustomLeg = {
  distanceMeters: number;
  durationSeconds: number;
  path: google.maps.LatLngLiteral[];
};

export type CustomLegsResult = {
  startLeg: CustomLeg | null;
  endLeg: CustomLeg | null;
};

type UseCustomLegsInput = {
  enabled: boolean;
  homeLocation: { lat: number; lng: number } | null;
  firstStop: { lat: number; lng: number } | null;
  lastStop: { lat: number; lng: number } | null;
};

type UseCustomLegsOutput = {
  status: 'idle' | 'loading' | 'computing' | 'ready' | 'error';
  result: CustomLegsResult | null;
  error: string | null;
};

export function useCustomLegs({
  enabled,
  homeLocation,
  firstStop,
  lastStop,
}: UseCustomLegsInput): UseCustomLegsOutput {
  const routesLib = useMapsLibrary('routes');
  const [status, setStatus] = useState<UseCustomLegsOutput['status']>('idle');
  const [result, setResult] = useState<CustomLegsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  useEffect(() => {
    if (!enabled || !homeLocation) {
      setStatus('idle');
      setResult(null);
      setError(null);
      return;
    }

    if (!firstStop || !lastStop) {
      setStatus('idle');
      setResult(null);
      return;
    }

    if (!routesLib) {
      setStatus('loading');
      return;
    }

    setStatus('computing');
    const myId = ++requestRef.current;

    const timer = setTimeout(() => {
      const service = new routesLib.DirectionsService();

      const homeLl: google.maps.LatLngLiteral = {
        lat: homeLocation.lat,
        lng: homeLocation.lng,
      };
      const firstLl: google.maps.LatLngLiteral = {
        lat: firstStop.lat,
        lng: firstStop.lng,
      };
      const lastLl: google.maps.LatLngLiteral = {
        lat: lastStop.lat,
        lng: lastStop.lng,
      };

      // Fire both legs in parallel
      const startLegPromise = new Promise<CustomLeg | null>((resolve) => {
        service.route(
          {
            origin: homeLl,
            destination: firstLl,
            travelMode: 'BICYCLING' as google.maps.TravelMode,
          },
          (response, reqStatus) => {
            if (reqStatus !== 'OK' || !response) {
              resolve(null);
              return;
            }
            const route = response.routes[0];
            if (!route) {
              resolve(null);
              return;
            }
            const leg = route.legs[0];
            resolve({
              distanceMeters: leg.distance?.value ?? 0,
              durationSeconds: leg.duration?.value ?? 0,
              path: route.overview_path.map((p) => ({
                lat: p.lat(),
                lng: p.lng(),
              })),
            });
          },
        );
      });

      const endLegPromise = new Promise<CustomLeg | null>((resolve) => {
        service.route(
          {
            origin: lastLl,
            destination: homeLl,
            travelMode: 'BICYCLING' as google.maps.TravelMode,
          },
          (response, reqStatus) => {
            if (reqStatus !== 'OK' || !response) {
              resolve(null);
              return;
            }
            const route = response.routes[0];
            if (!route) {
              resolve(null);
              return;
            }
            const leg = route.legs[0];
            resolve({
              distanceMeters: leg.distance?.value ?? 0,
              durationSeconds: leg.duration?.value ?? 0,
              path: route.overview_path.map((p) => ({
                lat: p.lat(),
                lng: p.lng(),
              })),
            });
          },
        );
      });

      Promise.all([startLegPromise, endLegPromise]).then(
        ([startLeg, endLeg]) => {
          if (myId !== requestRef.current) return; // stale
          setResult({ startLeg, endLeg });
          setStatus('ready');
          setError(null);
        },
      );
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [enabled, homeLocation, firstStop, lastStop, routesLib]);

  return { status, result, error };
}
