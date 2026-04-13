'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  type MapCameraChangedEvent,
} from '@vis.gl/react-google-maps';
import type { Restaurant, UserLocation } from '@/lib/types';
import { RestaurantMarker } from '@/components/map/RestaurantMarker';
import { MapHeader } from '@/components/map/MapHeader';
import { PlotModeFab } from '@/components/map/PlotModeFab';
import { RoutePolyline } from '@/components/map/RoutePolyline';
import { RestaurantSheet } from '@/components/sheets/RestaurantSheet';
import { PlotModeSheet } from '@/components/sheets/PlotModeSheet';
import { HomeLocationSetter } from '@/components/location/HomeLocationSetter';
import { DashedPolyline } from '@/components/map/DashedPolyline';
import { StarsProvider, useStars } from '@/components/context/StarsProvider';
import { usePlotRoute } from '@/lib/maps/use-plot-route';
import { useCustomLegs } from '@/lib/maps/use-custom-legs';

type MapViewProps = {
  restaurants: Restaurant[];
  displayName: string;
  mapsApiKey: string;
  initialStarredIds: string[];
  isAdmin: boolean;
  initialUserLocation: UserLocation | null;
};

type MapViewInnerProps = Omit<MapViewProps, 'initialStarredIds' | 'mapsApiKey'>;

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
  isAdmin,
  initialUserLocation,
}: MapViewProps) {
  if (!mapsApiKey) {
    return <MissingMapKeyNotice displayName={displayName} />;
  }

  // APIProvider wraps MapViewInner so any hooks inside (useMapsLibrary
  // from usePlotRoute, useMap from RoutePolyline) can find the Maps
  // context. Putting it inside MapViewInner would leave the hooks
  // stranded because they'd be called one level above their provider.
  return (
    <StarsProvider initialStarredIds={initialStarredIds}>
      <APIProvider apiKey={mapsApiKey}>
        <MapViewInner
          restaurants={restaurants}
          displayName={displayName}
          isAdmin={isAdmin}
          initialUserLocation={initialUserLocation}
        />
      </APIProvider>
    </StarsProvider>
  );
}

function MapViewInner({
  restaurants,
  displayName,
  isAdmin,
  initialUserLocation,
}: MapViewInnerProps) {
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [plotMode, setPlotMode] = useState(false);
  const [showHomeSheet, setShowHomeSheet] = useState(false);
  /**
   * User's custom stop order. Null means "use the starred set order".
   * When the user drags to reorder in the plot sheet, we store the
   * full new array here.
   */
  const [manualOrder, setManualOrder] = useState<Restaurant[] | null>(null);
  /** IDs of stops locked in place during optimization. */
  const [anchoredIds, setAnchoredIds] = useState<Set<string>>(new Set());
  /** True while an explicit optimize request is in flight. */
  const [optimizing, setOptimizing] = useState(false);
  const optimizeSeenComputing = useRef(false);
  const { starred, isStarred, toggle: toggleStar } = useStars();
  const bounds = useMemo(() => computeBounds(restaurants), [restaurants]);

  // Derive the ordered list of starred restaurants (stable order by
  // restaurant array index) for the plot route call.
  const starredRestaurants = useMemo(
    () => restaurants.filter((r) => starred.has(r.id)),
    [restaurants, starred],
  );

  // The actual waypoints we hand to the Directions hook: the user's
  // custom order when they've set one, otherwise the raw starred
  // set. In both cases, waypoints[0] is the anchor — usePlotRoute
  // uses it as origin + destination and optimizes the middle stops
  // (when `optimize: true`). No geolocation involved — the route
  // always starts and ends at the first stop in the list.
  const waypointsForRoute = manualOrder ?? starredRestaurants;

  const { status: plotStatus, result: plotResult, error: plotError } =
    usePlotRoute({
      enabled: plotMode,
      waypoints: waypointsForRoute,
      optimize: optimizing,
      anchoredIds,
    });

  // When an explicit optimize finishes, apply the result to manual order
  // and turn off the optimizing flag.
  useEffect(() => {
    if (!optimizing) return;
    if (plotStatus === 'computing') {
      optimizeSeenComputing.current = true;
    }
    if (
      plotStatus === 'ready' &&
      optimizeSeenComputing.current &&
      plotResult
    ) {
      setManualOrder(plotResult.orderedStops);
      setOptimizing(false);
      optimizeSeenComputing.current = false;
    }
  }, [optimizing, plotStatus, plotResult]);

  // Custom home→first and last→home legs for plot mode.
  const plotStops = plotResult?.orderedStops ?? [];
  const { result: customLegs } = useCustomLegs({
    enabled: plotMode && !!initialUserLocation,
    homeLocation: initialUserLocation,
    firstStop: plotStops.length > 0 ? plotStops[0] : null,
    lastStop: plotStops.length > 0 ? plotStops[plotStops.length - 1] : null,
  });

  // Exiting plot mode wipes any manual ordering the user had —
  // re-entering starts fresh with Google's optimization.
  useEffect(() => {
    if (!plotMode) {
      setManualOrder(null);
      setAnchoredIds(new Set());
      setOptimizing(false);
      optimizeSeenComputing.current = false;
    }
  }, [plotMode]);

  // Keep manualOrder in sync with the starred set. If the user stars
  // a new restaurant while in plot mode, append it to the end. If
  // they un-star one, drop it from the order. No-op if the set is
  // unchanged (common case — the effect re-runs whenever
  // starredRestaurants identity changes, which is every toggle).
  useEffect(() => {
    setManualOrder((prev) => {
      if (prev === null) return null;
      const starredIdSet = new Set(starredRestaurants.map((r) => r.id));
      const kept = prev.filter((r) => starredIdSet.has(r.id));
      const keptIdSet = new Set(kept.map((r) => r.id));
      const added = starredRestaurants.filter((r) => !keptIdSet.has(r.id));
      // Short-circuit if nothing changed so we don't create a new
      // array reference and re-trigger downstream effects.
      if (kept.length === prev.length && added.length === 0) {
        return prev;
      }
      return [...kept, ...added];
    });
  }, [starredRestaurants]);

  // Toggling plot mode: close any open restaurant sheet so the two
  // drawers don't stack.
  const togglePlotMode = () => {
    setPlotMode((prev) => {
      const next = !prev;
      if (next) setSelected(null);
      return next;
    });
  };

  /* ---------- reorder handlers ---------- */

  // Single reorder handler used by the drag-and-drop list in
  // PlotModeSheet. The sheet computes the new order using dnd-kit's
  // arrayMove utility (or any other reordering primitive) and passes
  // the full new array here. We just store it as the manual order.
  // The hook will recompute the route on the next render.
  const handleReorder = (newOrder: Restaurant[]) => {
    setManualOrder(newOrder);
  };

  const handleResetOrder = () => {
    setManualOrder(null);
    setAnchoredIds(new Set());
  };

  const handleToggleAnchor = (id: string) => {
    setAnchoredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleRemoveStop = (restaurantId: string) => {
    // Unstar the restaurant — this removes it from starredRestaurants
    // which triggers a recompute. Also remove from manual order if set.
    toggleStar(restaurantId);
    setManualOrder((prev) => {
      if (!prev) return null;
      const filtered = prev.filter((r) => r.id !== restaurantId);
      return filtered.length > 0 ? filtered : null;
    });
    // Remove from anchored set
    setAnchoredIds((prev) => {
      if (!prev.has(restaurantId)) return prev;
      const next = new Set(prev);
      next.delete(restaurantId);
      return next;
    });
  };

  const handleOptimize = () => {
    // If not already in manual order, snapshot the current display order
    if (!manualOrder) {
      setManualOrder(displayStops.length > 0 ? displayStops : starredRestaurants);
    }
    optimizeSeenComputing.current = false;
    setOptimizing(true);
  };

  // The stops to DISPLAY in the sheet. When the user has reordered,
  // their order is authoritative and should appear immediately (even
  // if the route is still recomputing for the new distance/duration).
  // When no manual order is set, we use whatever the hook returned.
  const displayStops = manualOrder ?? plotResult?.orderedStops ?? [];

  // Close the sheet if the user interacts with the map
  const handleCameraChanged = (_event: MapCameraChangedEvent) => {
    // Intentionally empty — we don't auto-close on pan/zoom, because
    // that feels hostile on mobile where any drag would dismiss the sheet.
  };

  return (
    <div className="fixed inset-0 overflow-hidden">
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
            onClick={() => {
              // Pin clicks are disabled during plot mode so the
              // restaurant sheet doesn't stack over the plot sheet.
              if (plotMode) return;
              setSelected(r);
            }}
            title={`${r.name} — ${r.pizzaName}`}
          >
            <RestaurantMarker
              restaurant={r}
              isSelected={selected?.id === r.id}
              isStarred={isStarred(r.id)}
            />
          </AdvancedMarker>
        ))}

        {/* Home pin — mustard house icon when the user has set a home location */}
        {initialUserLocation && (
          <AdvancedMarker
            position={{ lat: initialUserLocation.lat, lng: initialUserLocation.lng }}
            title={`Home: ${initialUserLocation.formattedAddress}`}
          >
            <div
              role="img"
              aria-label="Your home location"
              className="font-mono flex size-7 items-center justify-center rounded-full border-[2px] border-dashed border-ink bg-mustard text-[12px] text-ink shadow-[0_3px_0_rgba(22,20,19,0.55),0_4px_10px_rgba(22,20,19,0.3)]"
            >
              &#x2302;
            </div>
          </AdvancedMarker>
        )}

        {/* Plot-route polyline overlay — only rendered when the
            directions call has succeeded. */}
        {plotMode && plotResult && plotResult.path.length > 0 && (
          <RoutePolyline path={plotResult.path} />
        )}

        {/* Dashed personal legs — home to first stop, last stop to home */}
        {plotMode && customLegs?.startLeg && (
          <DashedPolyline path={customLegs.startLeg.path} />
        )}
        {plotMode && customLegs?.endLeg && (
          <DashedPolyline path={customLegs.endLeg.path} />
        )}
      </Map>

      <MapHeader displayName={displayName} isAdmin={isAdmin} />

      <PlotModeFab active={plotMode} onToggle={togglePlotMode} />

      {/* Set Home FAB — always visible, left side */}
      {!plotMode && (
        <button
          type="button"
          onClick={() => setShowHomeSheet((prev) => !prev)}
          aria-label={initialUserLocation ? 'Edit home location' : 'Set home location'}
          className={`font-mono fixed left-4 z-40 flex items-center gap-2 border-[2.5px] px-3 py-2 text-[10px] font-bold tracking-[0.2em] uppercase shadow-[3px_3px_0_rgba(22,20,19,0.3)] transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sauce sm:px-4 sm:py-2.5 sm:text-[11px] ${
            initialUserLocation
              ? 'rotate-[-2deg] border-dashed border-mustard bg-cream text-ink hover:bg-mustard hover:shadow-[5px_5px_0_rgba(22,20,19,0.4)]'
              : 'rotate-[-2deg] border-ink bg-cream text-ink hover:bg-mustard hover:shadow-[5px_5px_0_rgba(22,20,19,0.4)]'
          }`}
          style={{ top: 'calc(env(safe-area-inset-top) + 78px)' }}
        >
          <span aria-hidden className="text-sm leading-none">
            &#x2302;
          </span>
          <span>{initialUserLocation ? 'Home' : 'Set Home'}</span>
        </button>
      )}

      {/* Home location sheet — compact panel under the button */}
      {showHomeSheet && !plotMode && (
        <div
          className="fixed left-4 right-4 z-50 max-w-[400px] border-[2px] border-ink bg-cream p-4 shadow-[6px_6px_0_rgba(22,20,19,0.15)]"
          style={{ top: 'calc(env(safe-area-inset-top) + 126px)' }}
        >
          <HomeLocationSetter initialLocation={initialUserLocation} />
        </div>
      )}

      <RestaurantSheet
        restaurant={selected}
        onClose={() => setSelected(null)}
      />

      <PlotModeSheet
        open={plotMode}
        onExit={() => setPlotMode(false)}
        status={plotStatus}
        result={plotResult}
        error={plotError}
        starredCount={starredRestaurants.length}
        displayStops={displayStops}
        isManualOrder={manualOrder !== null}
        onReorder={handleReorder}
        onResetOrder={handleResetOrder}
        onRemoveStop={handleRemoveStop}
        customLegs={customLegs}
        anchoredIds={anchoredIds}
        onToggleAnchor={handleToggleAnchor}
        onOptimize={handleOptimize}
        isOptimizing={optimizing}
        userLocation={initialUserLocation}
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
