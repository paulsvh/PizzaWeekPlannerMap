'use client';

import { useMemo, useState } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  type MapCameraChangedEvent,
} from '@vis.gl/react-google-maps';
import type { Restaurant } from '@/lib/types';
import { RestaurantMarker } from '@/components/map/RestaurantMarker';
import { MapHeader } from '@/components/map/MapHeader';
import { RestaurantSheet } from '@/components/sheets/RestaurantSheet';
import { StarsProvider, useStars } from '@/components/context/StarsProvider';

type MapViewProps = {
  restaurants: Restaurant[];
  displayName: string;
  mapsApiKey: string;
  initialStarredIds: string[];
};

type MapViewInnerProps = Omit<MapViewProps, 'initialStarredIds'>;

// Downtown Portland — used as the fallback center when we can't compute
// bounds from restaurants (e.g. empty list in dev).
const PORTLAND_CENTER = { lat: 45.5152, lng: -122.6784 };
const DEFAULT_ZOOM = 12;

function computeBounds(restaurants: Restaurant[]) {
  if (restaurants.length === 0) return null;
  const lats = restaurants.map((r) => r.lat);
  const lngs = restaurants.map((r) => r.lng);
  const padding = 0.015; // ~1.5km at this latitude, enough to show marker dots
  return {
    north: Math.max(...lats) + padding,
    south: Math.min(...lats) - padding,
    east: Math.max(...lngs) + padding,
    west: Math.min(...lngs) - padding,
  };
}

/**
 * The main Pizza Week map page — a full-viewport Google Map with a
 * pin for every participating restaurant, plus a floating broadsheet
 * header and a vaul bottom sheet that opens on pin tap.
 *
 * The outer MapView establishes the StarsProvider so MapViewInner
 * and RestaurantSheet (both descendants) can call useStars() to
 * read/toggle the current user's stars. initialStarredIds are seeded
 * from a server-side Firestore fetch in app/page.tsx so there's no
 * "loading" flash of empty stars on first render.
 *
 * No client-side Firebase: the parent Server Component fetches the
 * restaurants array and starred IDs via the Admin SDK and passes
 * them down as props. The only client network traffic from this
 * page is the Maps JS API itself and the /api/stars toggle POSTs.
 */
export function MapView({
  restaurants,
  displayName,
  mapsApiKey,
  initialStarredIds,
}: MapViewProps) {
  if (!mapsApiKey) {
    return <MissingMapKeyNotice displayName={displayName} />;
  }

  return (
    <StarsProvider initialStarredIds={initialStarredIds}>
      <MapViewInner
        restaurants={restaurants}
        displayName={displayName}
        mapsApiKey={mapsApiKey}
      />
    </StarsProvider>
  );
}

function MapViewInner({
  restaurants,
  displayName,
  mapsApiKey,
}: MapViewInnerProps) {
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const { isStarred } = useStars();
  const bounds = useMemo(() => computeBounds(restaurants), [restaurants]);

  // Close the sheet if the user interacts with the map
  const handleCameraChanged = (_event: MapCameraChangedEvent) => {
    // Intentionally empty — we don't auto-close on pan/zoom, because
    // that feels hostile on mobile where any drag would dismiss the sheet.
  };

  return (
    <div className="fixed inset-0 overflow-hidden">
      <APIProvider apiKey={mapsApiKey}>
        <Map
          mapId="DEMO_MAP_ID"
          defaultCenter={PORTLAND_CENTER}
          defaultZoom={DEFAULT_ZOOM}
          defaultBounds={bounds ?? undefined}
          gestureHandling="greedy"
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={false}
          onCameraChanged={handleCameraChanged}
          className="h-full w-full"
        >
          {restaurants.map((r) => (
            <AdvancedMarker
              key={r.id}
              position={{ lat: r.lat, lng: r.lng }}
              onClick={() => setSelected(r)}
              title={`${r.name} — ${r.pizzaName}`}
            >
              <RestaurantMarker
                restaurant={r}
                isSelected={selected?.id === r.id}
                isStarred={isStarred(r.id)}
              />
            </AdvancedMarker>
          ))}
        </Map>
      </APIProvider>

      <MapHeader displayName={displayName} />

      <RestaurantSheet
        restaurant={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

/* =========================================================================
   Missing API key fallback
   A broadsheet "pressroom bulletin" styled notice explaining the setup.
   ========================================================================= */

function MissingMapKeyNotice({ displayName }: { displayName: string }) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 py-8">
      <div className="flex w-full max-w-[480px] flex-col gap-6">
        <div
          className="font-mono animate-rise text-[10px] tracking-[0.25em] text-ink-soft uppercase"
          style={{ animationDelay: '100ms' }}
        >
          Pressroom Bulletin &nbsp;·&nbsp; Dispatch for {displayName}
        </div>

        <div
          className="animate-slash h-[3px] bg-ink"
          style={{ animationDelay: '180ms' }}
        />

        <h1
          className="font-display animate-rise text-[clamp(3rem,13vw,5.5rem)] leading-[0.85] font-black tracking-[-0.03em] text-ink"
          style={{ animationDelay: '280ms' }}
        >
          Map Key
          <span className="block text-sauce italic">Missing</span>
        </h1>

        <div
          className="animate-slash h-[3px] bg-ink"
          style={{ animationDelay: '380ms' }}
        />

        <p
          className="font-display animate-rise text-base leading-relaxed text-ink-soft sm:text-[17px]"
          style={{ animationDelay: '500ms' }}
        >
          The presses are jammed. Before we can print the map, the editor needs
          a Google Maps API key in your <code className="font-mono bg-cream-deep px-1.5 py-0.5 text-[12px]">.env.local</code>.
        </p>

        <div
          className="animate-rise flex flex-col gap-4 border-[2.5px] border-dashed border-ink bg-cream/40 p-5 sm:p-6"
          style={{ animationDelay: '620ms' }}
        >
          <div className="font-mono -mt-1 flex items-center justify-between border-b-2 border-ink pb-2">
            <span className="text-[11px] font-bold tracking-[0.2em] uppercase">
              &#9660; Setup Instructions
            </span>
            <span className="text-[9px] tracking-[0.22em] text-ink-soft uppercase">
              Please Follow
            </span>
          </div>

          <ol className="font-display flex list-none flex-col gap-3 text-sm leading-relaxed text-ink-soft">
            <li className="flex items-start gap-2.5">
              <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-sauce">01</span>
              <span>Create a browser API key in the GCP Console → Credentials</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-sauce">02</span>
              <span>Enable Maps JavaScript API and Directions API</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-sauce">03</span>
              <span>
                Restrict by HTTP referrer to{' '}
                <code className="font-mono bg-cream-deep px-1.5 py-0.5 text-[11px]">
                  http://localhost:3000/*
                </code>
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-sauce">04</span>
              <span>
                Paste into{' '}
                <code className="font-mono bg-cream-deep px-1.5 py-0.5 text-[11px]">.env.local</code>{' '}
                as
                <code className="font-mono mt-1 block bg-ink px-2 py-1.5 text-[10px] text-cream">
                  NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY=AIzaSy&hellip;
                </code>
              </span>
            </li>
          </ol>

          <p className="font-mono text-[9px] tracking-[0.2em] text-ink-soft/70 uppercase">
            Dev-server restart not required &mdash; reload the page after saving.
          </p>
        </div>

        <div
          className="font-mono animate-rise flex items-center justify-between text-[9px] tracking-[0.2em] text-ink-soft uppercase"
          style={{ animationDelay: '780ms' }}
        >
          <span>Printed in PDX</span>
          <span>&sect;</span>
          <span>Technical Notice</span>
        </div>
      </div>
    </main>
  );
}
