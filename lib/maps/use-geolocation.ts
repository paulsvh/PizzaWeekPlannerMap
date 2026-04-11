'use client';

import { useCallback, useState } from 'react';

/**
 * Thin hook around navigator.geolocation for our plot-route flow.
 *
 * Fire-and-forget: call `request()` to trigger the browser prompt;
 * subsequent reads of `coords` + `status` reflect the result. There's
 * no continuous tracking (we don't need it for plotting a static
 * route, and watchPosition burns battery).
 */

export type GeoStatus =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'timeout';

export type GeoCoords = {
  lat: number;
  lng: number;
};

type UseGeolocationResult = {
  coords: GeoCoords | null;
  status: GeoStatus;
  request: () => void;
  reset: () => void;
};

export function useGeolocation(): UseGeolocationResult {
  const [coords, setCoords] = useState<GeoCoords | null>(null);
  const [status, setStatus] = useState<GeoStatus>('idle');

  const request = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable');
      return;
    }

    setStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setStatus('granted');
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied');
        } else if (err.code === err.TIMEOUT) {
          setStatus('timeout');
        } else {
          setStatus('unavailable');
        }
      },
      {
        timeout: 10_000,
        enableHighAccuracy: false,
        maximumAge: 5 * 60 * 1000,
      },
    );
  }, []);

  const reset = useCallback(() => {
    setCoords(null);
    setStatus('idle');
  }, []);

  return { coords, status, request, reset };
}
