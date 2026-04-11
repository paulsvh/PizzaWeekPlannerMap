'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { RoutePolyline } from '@/components/map/RoutePolyline';
import type { Restaurant } from '@/lib/types';

type RouteDetailMapProps = {
  mapsApiKey: string;
  encodedPolyline: string;
  stops: Restaurant[];
  origin: { lat: number; lng: number };
};

/**
 * Read-only map for the saved-route detail page.
 *
 * Unlike the live MapView, this component does NOT call Directions.
 * It takes the stored encodedPolyline, decodes it via the Google
 * Maps geometry library (lazy-loaded through useMapsLibrary), and
 * hands the LatLng array to the existing RoutePolyline renderer.
 * Plus a numbered marker at each stop so you can scan the order.
 *
 * The APIProvider is local to this component because the route
 * detail page is a Server Component and can't host React context.
 */
export function RouteDetailMap({
  mapsApiKey,
  encodedPolyline,
  stops,
  origin,
}: RouteDetailMapProps) {
  if (!mapsApiKey) {
    return (
      <div className="font-mono flex h-full w-full items-center justify-center bg-cream-deep/50 p-6 text-center text-[10px] tracking-[0.2em] text-ink-soft uppercase">
        &mdash; Map unavailable: NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY is not set &mdash;
      </div>
    );
  }

  const bounds = useMemo(
    () => computeBounds(origin, stops),
    [origin, stops],
  );

  return (
    <APIProvider apiKey={mapsApiKey}>
      <Map
        mapId="DEMO_MAP_ID"
        defaultBounds={bounds ?? undefined}
        defaultCenter={origin}
        defaultZoom={13}
        gestureHandling="greedy"
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={false}
        className="h-full w-full"
      >
        <DecodedPolyline encoded={encodedPolyline} />

        {/* Origin marker (start/end of the loop) */}
        <AdvancedMarker
          position={origin}
          title="Route origin"
        >
          <OriginPin />
        </AdvancedMarker>

        {/* Stop markers in their saved order */}
        {stops.map((stop, i) => (
          <AdvancedMarker
            key={stop.id}
            position={{ lat: stop.lat, lng: stop.lng }}
            title={`${i + 1}. ${stop.name} — ${stop.pizzaName}`}
          >
            <NumberedPin index={i + 1} />
          </AdvancedMarker>
        ))}
      </Map>
    </APIProvider>
  );
}

/* -------------------------------------------------------------------------
   DecodedPolyline — lazy-loads the geometry library and decodes the
   encoded polyline into a LatLng path once the library is available.
   ------------------------------------------------------------------------- */

function DecodedPolyline({ encoded }: { encoded: string }) {
  const geometry = useMapsLibrary('geometry');
  const [path, setPath] = useState<google.maps.LatLngLiteral[]>([]);

  useEffect(() => {
    if (!geometry || !encoded) return;
    const decoded = geometry.encoding.decodePath(encoded);
    setPath(decoded.map((p) => ({ lat: p.lat(), lng: p.lng() })));
  }, [geometry, encoded]);

  if (path.length === 0) return null;
  return <RoutePolyline path={path} />;
}

/* -------------------------------------------------------------------------
   Pin designs
   ------------------------------------------------------------------------- */

function NumberedPin({ index }: { index: number }) {
  return (
    <div
      role="img"
      aria-label={`Stop ${index}`}
      className="font-mono flex size-8 items-center justify-center rounded-full border-[2px] border-ink bg-sauce text-[11px] font-bold text-cream shadow-[0_3px_0_rgba(22,20,19,0.55),0_4px_10px_rgba(22,20,19,0.3)]"
    >
      {String(index).padStart(2, '0')}
    </div>
  );
}

function OriginPin() {
  return (
    <div
      role="img"
      aria-label="Route origin"
      className="font-mono flex size-7 items-center justify-center rounded-full border-[2px] border-ink bg-mustard text-[11px] font-bold text-ink shadow-[0_3px_0_rgba(22,20,19,0.55),0_4px_10px_rgba(22,20,19,0.3)]"
    >
      &#x2605;
    </div>
  );
}

/* -------------------------------------------------------------------------
   Bounds helper
   ------------------------------------------------------------------------- */

function computeBounds(
  origin: { lat: number; lng: number },
  stops: Restaurant[],
) {
  const points = [origin, ...stops.map((s) => ({ lat: s.lat, lng: s.lng }))];
  if (points.length === 0) return null;
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const padding = 0.01;
  return {
    north: Math.max(...lats) + padding,
    south: Math.min(...lats) - padding,
    east: Math.max(...lngs) + padding,
    west: Math.min(...lngs) - padding,
  };
}
