'use client';

import { useMemo } from 'react';
import { Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { RoutePolyline } from '@/components/map/RoutePolyline';
import type { Restaurant } from '@/lib/types';

type RouteEditorMapProps = {
  /** Current draft stops in display order. */
  stops: Restaurant[];
  /**
   * Decoded polyline from the live `usePlotRoute` result. Empty
   * array when no result is available yet — the map renders the
   * numbered markers with no polyline overlaid.
   */
  path: google.maps.LatLngLiteral[];
  /** User's home location for home pin on the map. */
  homeLocation?: { lat: number; lng: number; formattedAddress: string } | null;
};

/**
 * Embedded live map for the route editor.
 *
 * The parent `<RouteEditor>` wraps its subtree in `<APIProvider>`,
 * so this component can assume Maps context is already available.
 * Bounds are computed ONCE from the initial draft stops so the map
 * doesn't jerk around when the user adds/removes/reorders — the
 * polyline and markers update in place within a stable viewport.
 *
 * Styled to sit inside a heavy 3px ink border on the parent,
 * matching the framed-photograph aesthetic of the read-only
 * `<RouteDetailMap>` on the detail page.
 */
export function RouteEditorMap({ stops, path, homeLocation }: RouteEditorMapProps) {
  // Intentional: we compute bounds from the FIRST set of stops and
  // then never recompute (hence the empty dep array). Editing a
  // route shouldn't re-center the camera on every tap.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialBounds = useMemo(() => computeBounds(stops), []);

  return (
    <Map
      mapId="DEMO_MAP_ID"
      defaultBounds={initialBounds ?? undefined}
      defaultCenter={
        initialBounds ? undefined : { lat: 45.5152, lng: -122.6784 }
      }
      defaultZoom={13}
      gestureHandling="greedy"
      mapTypeControl={false}
      streetViewControl={false}
      fullscreenControl={false}
      className="h-full w-full"
    >
      {path.length > 0 && <RoutePolyline path={path} />}

      {/* Home pin */}
      {homeLocation && (
        <AdvancedMarker
          position={{ lat: homeLocation.lat, lng: homeLocation.lng }}
          title={`Home: ${homeLocation.formattedAddress}`}
        >
          <div
            role="img"
            aria-label="Home"
            className="font-mono flex size-7 items-center justify-center rounded-full border-[2px] border-dashed border-ink bg-mustard text-[12px] text-ink shadow-[0_3px_0_rgba(22,20,19,0.55),0_4px_10px_rgba(22,20,19,0.3)]"
          >
            &#x2302;
          </div>
        </AdvancedMarker>
      )}

      {stops.map((stop, i) => (
        <AdvancedMarker
          key={stop.id}
          position={{ lat: stop.lat, lng: stop.lng }}
          title={`${i + 1}. ${stop.name} — ${stop.pizzaName}`}
        >
          <NumberedPin index={i + 1} isFirst={i === 0} />
        </AdvancedMarker>
      ))}
    </Map>
  );
}

/* -------------------------------------------------------------------------
   NumberedPin — mirrors the saved-route detail page's pin, but tints
   the first stop mustard (Start/End anchor) while subsequent stops are
   sauce-red with a cream numeral. No selected/hover states because the
   editor map is non-interactive — clicks don't do anything here; adds
   happen through the "Also Available" list in the main editor body.
   ------------------------------------------------------------------------- */

function NumberedPin({ index, isFirst }: { index: number; isFirst: boolean }) {
  return (
    <div
      role="img"
      aria-label={isFirst ? `Start and end: stop ${index}` : `Stop ${index}`}
      className={`font-mono flex size-8 items-center justify-center rounded-full border-[2px] border-ink text-[11px] font-bold shadow-[0_3px_0_rgba(22,20,19,0.55),0_4px_10px_rgba(22,20,19,0.3)] ${
        isFirst ? 'bg-mustard text-ink' : 'bg-sauce text-cream'
      }`}
    >
      {String(index).padStart(2, '0')}
    </div>
  );
}

/* -------------------------------------------------------------------------
   Bounds helper — same pattern used elsewhere in the app: take the
   min/max lat/lng of the stop set, pad slightly, and hand it to the
   Map as `defaultBounds`.
   ------------------------------------------------------------------------- */

function computeBounds(stops: Restaurant[]) {
  if (stops.length === 0) return null;
  const lats = stops.map((s) => s.lat);
  const lngs = stops.map((s) => s.lng);
  const padding = 0.01;
  return {
    north: Math.max(...lats) + padding,
    south: Math.min(...lats) - padding,
    east: Math.max(...lngs) + padding,
    west: Math.min(...lngs) - padding,
  };
}
