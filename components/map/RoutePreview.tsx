'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { RoutePolyline } from '@/components/map/RoutePolyline';
import type { PlotResult } from '@/lib/maps/use-plot-route';
import type { Restaurant } from '@/lib/types';

type RoutePreviewProps = {
  result: PlotResult;
  stops: Restaurant[];
  displayName: string;
  onClose: () => void;
};

/**
 * Full-screen route preview overlay — the "galley proof" of a route
 * dispatch before it goes to print (save). Mirrors the editorial
 * layout of app/routes/[routeId]/page.tsx but framed as an unsaved
 * draft: dashed borders replace solid ones, a "PROOF" stamp marks
 * the masthead, and the nav says "Back to Plot Mode" instead of
 * "Back to Map."
 *
 * Renders inside MapView's existing APIProvider, so the <Map> here
 * gets its own map instance without needing a separate provider.
 */
export function RoutePreview({
  result,
  stops,
  displayName,
  onClose,
}: RoutePreviewProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // Auto-focus the close button for accessibility when the overlay mounts.
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  const miles = (result.totalDistanceMeters / 1609.344).toFixed(1);
  const durationText = formatDuration(result.totalDurationSeconds);

  const bounds = useMemo(
    () => computeBounds(result.origin, stops),
    [result.origin, stops],
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Route preview"
      className="fixed inset-0 z-[60] overflow-y-auto bg-cream"
      style={{
        backgroundImage:
          'radial-gradient(circle at 1px 1px, rgba(22, 20, 19, 0.09) 1px, transparent 0)',
        backgroundSize: '5px 5px',
      }}
    >
      <main className="relative min-h-dvh">
        {/* ==============================================================
            Sticky nav — "Back to Plot Mode"
            ============================================================== */}
        <nav
          className="sticky top-0 z-40 border-b-2 border-dashed border-ink bg-cream/95 backdrop-blur-sm"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-3 sm:px-6">
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="group font-mono flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] text-ink-soft uppercase transition-colors hover:text-sauce sm:text-[11px]"
            >
              <span
                aria-hidden
                className="transition-transform group-hover:-translate-x-0.5"
              >
                &larr;
              </span>
              <span>Back to Plot Mode</span>
            </button>
            <span className="font-mono text-[10px] tracking-[0.2em] text-ink-faded uppercase sm:text-[11px]">
              Proof &middot; Unsaved
            </span>
          </div>
        </nav>

        <article className="relative mx-auto max-w-3xl px-5 pt-10 pb-16 sm:pt-14">
          {/* ==============================================================
              Hero masthead — "Route Preview"
              ============================================================== */}
          <header className="flex flex-col gap-3">
            <div
              className="font-mono animate-rise flex items-center justify-between gap-2 text-[10px] tracking-[0.22em] text-ink-soft uppercase sm:text-[11px]"
              style={{ animationDelay: '100ms' }}
            >
              <span>Route Dispatch &middot; Preview</span>
              <span className="hidden text-ink-faded sm:inline">
                Portland &middot; 2026
              </span>
            </div>

            <div
              className="animate-slash h-[3px] bg-ink"
              style={{ animationDelay: '180ms' }}
            />

            <div className="relative">
              <h1
                className="font-display animate-rise leading-[0.85] tracking-[-0.03em] text-ink"
                style={{ animationDelay: '280ms' }}
              >
                <span className="block text-[clamp(3rem,13vw,5.5rem)] font-black">
                  Your Pizza
                </span>
                <span className="-mt-[0.08em] block text-[clamp(3rem,13vw,5.5rem)] font-black text-sauce italic">
                  Crawl
                </span>
              </h1>

              {/* PROOF stamp — rotated dashed-border badge */}
              <div
                aria-hidden
                className="animate-stamp pointer-events-none absolute -top-2 right-0 sm:right-4"
                style={{ animationDelay: '800ms' }}
              >
                <div className="font-mono rotate-[-8deg] border-[2.5px] border-dashed border-sauce bg-cream/70 px-3 py-1.5 text-center text-[9px] leading-[1.15] font-bold tracking-[0.2em] text-sauce uppercase shadow-[3px_3px_0_rgba(179,33,19,0.15)] backdrop-blur-[1px] sm:text-[11px]">
                  Galley
                  <br />
                  Proof
                </div>
              </div>
            </div>

            <div
              className="animate-slash h-[3px] bg-ink"
              style={{ animationDelay: '380ms' }}
            />

            <div
              className="font-mono animate-rise flex flex-wrap items-center justify-between gap-2 text-[10px] tracking-[0.2em] text-ink-soft uppercase sm:text-[11px]"
              style={{ animationDelay: '460ms' }}
            >
              <span>
                {stops.length} stops &middot; biking &middot; start to finish
              </span>
              <span className="text-ink-faded">
                By {displayName}
              </span>
            </div>
          </header>

          {/* ==============================================================
              Stats infographic — Miles / Biking / Stops
              ============================================================== */}
          <section
            className="animate-rise mt-8 grid grid-cols-3 gap-2 border-y-2 border-ink py-5"
            style={{ animationDelay: '580ms' }}
            aria-label="Route statistics"
          >
            <Stat value={miles} label="Miles" />
            <Stat
              value={durationText.value}
              label={durationText.label}
              divider
            />
            <Stat value={String(stops.length)} label="Stops" divider />
          </section>

          {/* ==============================================================
              Embedded map — framed like a pinned photograph
              ============================================================== */}
          <figure
            className="animate-rise mt-8 flex flex-col"
            style={{ animationDelay: '720ms' }}
          >
            <div
              role="img"
              aria-label={`Map preview of your route with ${stops.length} stops`}
              className="relative h-[50vh] max-h-[540px] min-h-[320px] w-full border-[3px] border-dashed border-ink bg-cream-deep shadow-[6px_6px_0_rgba(22,20,19,0.12)]"
            >
              <Map
                mapId="DEMO_MAP_ID"
                defaultBounds={bounds ?? undefined}
                defaultCenter={result.origin}
                defaultZoom={13}
                gestureHandling="greedy"
                mapTypeControl={false}
                streetViewControl={false}
                fullscreenControl={false}
                className="h-full w-full"
              >
                <RoutePolyline path={result.path} />

                {/* Origin pin */}
                <AdvancedMarker
                  position={result.origin}
                  title="Route origin"
                >
                  <OriginPin />
                </AdvancedMarker>

                {/* Numbered stop pins */}
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
            </div>
            <figcaption className="flex items-center justify-between border-x-[3px] border-b-[3px] border-dashed border-ink bg-cream px-4 py-1.5">
              <span className="font-mono text-[9px] tracking-[0.22em] text-ink-soft uppercase">
                &#9662; Route Preview
              </span>
              <span className="font-mono text-[9px] tracking-[0.22em] text-ink-soft uppercase">
                Via Google Bicycling
              </span>
            </figcaption>
          </figure>

          {/* ==============================================================
              Ordered stops list
              ============================================================== */}
          <section
            className="animate-rise mt-10 flex flex-col gap-4"
            style={{ animationDelay: '860ms' }}
          >
            <div className="flex items-center gap-3">
              <span aria-hidden className="h-[2px] w-6 bg-ink sm:w-8" />
              <h2 className="font-mono text-[11px] font-bold tracking-[0.25em] text-ink uppercase sm:text-[12px]">
                In Order
              </h2>
              <span aria-hidden className="h-[2px] flex-1 bg-ink" />
            </div>

            <p className="font-mono text-[9px] tracking-[0.2em] text-ink-soft/70 uppercase italic">
              Preview only &mdash; this route has not been saved yet.
            </p>

            <ol className="flex flex-col gap-2.5">
              {stops.map((stop, i) => (
                <StopCard
                  key={stop.id}
                  stop={stop}
                  index={i + 1}
                  isStart={i === 0}
                  isEnd={i === stops.length - 1}
                  legInMeters={i > 0 ? result.legDistancesMeters[i - 1] : undefined}
                  legInSeconds={i > 0 ? result.legDurationsSeconds[i - 1] : undefined}
                />
              ))}
            </ol>
          </section>

          {/* ==============================================================
              Back to plot mode CTA
              ============================================================== */}
          <section
            className="animate-rise mt-10 flex flex-col gap-3"
            style={{ animationDelay: '1000ms' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="group font-mono flex items-center justify-between border-2 border-ink bg-ink px-5 py-4 text-sm font-bold tracking-[0.18em] text-cream uppercase transition-colors hover:border-sauce hover:bg-sauce focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sauce sm:text-base"
            >
              <span
                aria-hidden
                className="transition-transform group-hover:-translate-x-1"
              >
                &larr;
              </span>
              <span>Back to Plot Mode</span>
              <span aria-hidden className="w-4" />
            </button>
          </section>

          {/* ==============================================================
              Footer colophon
              ============================================================== */}
          <footer
            className="animate-rise mt-12 flex flex-col gap-2 border-t border-dashed border-ink/30 pt-4"
            style={{ animationDelay: '1100ms' }}
          >
            <div className="font-mono flex items-center justify-between gap-3 text-[9px] tracking-[0.22em] text-ink-soft uppercase sm:text-[10px]">
              <span>Printed in PDX</span>
              <span>&sect;</span>
              <span>Galley Proof</span>
            </div>
            <p className="font-mono text-center text-[8px] tracking-[0.2em] text-ink-faded uppercase">
              This is a preview &mdash; return to plot mode to save or edit
            </p>
          </footer>
        </article>
      </main>
    </div>
  );
}

/* =========================================================================
   Stat — one cell of the three-column infographic
   ========================================================================= */

function Stat({
  value,
  label,
  divider = false,
}: {
  value: string;
  label: string;
  divider?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-1 ${
        divider ? 'border-l border-ink/30' : ''
      }`}
    >
      <span className="font-display text-[clamp(1.75rem,7vw,2.75rem)] leading-none font-black tracking-[-0.02em] text-ink">
        {value}
      </span>
      <span className="font-mono text-[9px] font-bold tracking-[0.22em] text-ink-soft uppercase">
        {label}
      </span>
    </div>
  );
}

/* =========================================================================
   StopCard — one stop in the ordered list
   ========================================================================= */

function StopCard({
  stop,
  index,
  isStart,
  isEnd,
  legInMeters,
  legInSeconds,
}: {
  stop: Restaurant;
  index: number;
  isStart: boolean;
  isEnd: boolean;
  legInMeters?: number;
  legInSeconds?: number;
}) {
  const hasLegIn = !isStart && typeof legInMeters === 'number';
  return (
    <li className="flex flex-col gap-2 border-[1.5px] border-dashed border-ink bg-cream px-4 py-3 shadow-[3px_3px_0_rgba(22,20,19,0.08)]">
      {isStart && (
        <div className="font-mono flex items-center gap-2 border-b border-sauce/50 pb-2 text-[9px] tracking-[0.22em] uppercase">
          <span aria-hidden className="text-sauce">
            &#x2605;
          </span>
          <span className="font-bold text-sauce">Start</span>
          <span aria-hidden className="text-ink-faded/60">
            &middot;
          </span>
          <span className="text-ink-soft">The crawl begins here</span>
        </div>
      )}
      {isEnd && !isStart && (
        <div className="font-mono flex items-center gap-2 border-b border-ink/30 pb-2 text-[9px] tracking-[0.22em] uppercase">
          <span aria-hidden className="text-ink-soft">
            &#x2691;
          </span>
          <span className="font-bold text-ink-soft">Finish</span>
          <span aria-hidden className="text-ink-faded/60">
            &middot;
          </span>
          <span className="text-ink-faded">Last stop &mdash; disperse!</span>
        </div>
      )}

      {hasLegIn && (
        <div className="font-mono flex items-center gap-2 border-b border-ink/20 pb-2 text-[9px] tracking-[0.18em] text-ink-soft uppercase">
          <span aria-hidden className="text-sauce">
            &darr;
          </span>
          <span className="font-bold text-ink-soft">From Previous</span>
          <span aria-hidden className="text-ink-faded/60">
            &middot;
          </span>
          <span className="font-bold text-ink">
            {formatMilesShort(legInMeters!)} mi
          </span>
          <span aria-hidden className="text-ink-faded/60">
            &middot;
          </span>
          <span className="text-ink-soft">
            {formatMinutesShort(legInSeconds ?? 0)}
          </span>
        </div>
      )}

      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="font-mono shrink-0 bg-ink px-2 py-1 text-[11px] font-bold tracking-[0.1em] text-cream"
        >
          {String(index).padStart(2, '0')}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base leading-tight font-bold text-ink sm:text-lg">
            {stop.pizzaName}
          </p>
          <p className="font-mono mt-0.5 text-[10px] tracking-[0.15em] text-ink-soft uppercase">
            {stop.name}
            {stop.neighborhood ? (
              <span className="text-ink-faded">
                {' '}
                &middot; {stop.neighborhood}
              </span>
            ) : null}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-ink/20 pt-2">
        <span className="font-mono truncate text-[9px] tracking-[0.15em] text-ink-faded uppercase">
          {stop.address}
        </span>
      </div>
    </li>
  );
}

/* =========================================================================
   Pin designs — matching RouteDetailMap
   ========================================================================= */

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

/* =========================================================================
   Bounds helper
   ========================================================================= */

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

/* =========================================================================
   Formatters
   ========================================================================= */

function formatMilesShort(meters: number): string {
  const miles = meters / 1609.344;
  if (miles < 0.1) return '<0.1';
  return miles.toFixed(1);
}

function formatMinutesShort(seconds: number): string {
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h${mins}`;
}

function formatDuration(seconds: number): { value: string; label: string } {
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) {
    return { value: String(totalMinutes), label: 'Minutes' };
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (mins === 0) {
    return { value: `${hours}h`, label: 'Biking' };
  }
  return { value: `${hours}h${mins}`, label: 'Biking' };
}
