import { notFound } from 'next/navigation';
import Link from 'next/link';
import { verifySession } from '@/lib/auth/dal';
import { getRouteById } from '@/lib/firebase/routes';
import { getRestaurantsByIds } from '@/lib/firebase/restaurants';
import { RouteDetailMap } from '@/components/map/RouteDetailMap';
import type { Restaurant } from '@/lib/types';

type PageProps = {
  params: Promise<{ routeId: string }>;
};

/**
 * Saved-route detail page — the "Filed Dispatch."
 *
 * Read-only editorial artifact of a persisted route. Runs as a
 * Server Component, fetches the route + hydrated stops via the
 * Admin SDK, and composes a scrollable broadsheet article around
 * the embedded `<RouteDetailMap>` client component.
 *
 * Voting and delete actions are stubbed as dashed-border "Phase 6b"
 * placeholders and will be wired up in the next phase.
 */
export default async function RouteDetailPage({ params }: PageProps) {
  const { routeId } = await params;
  const session = await verifySession();
  const route = await getRouteById(routeId);
  if (!route) {
    notFound();
  }

  const stops = await getRestaurantsByIds(route.stopRestaurantIds);

  const miles = (route.totalDistanceMeters / 1609.344).toFixed(1);
  const durationText = formatDuration(route.totalDurationSeconds);
  const createdAtText = new Date(route.createdAt).toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const isCreator = session.userId === route.creatorUserId;
  const missingStops = route.stopRestaurantIds.length - stops.length;

  return (
    <main className="relative min-h-dvh">
      {/* ============================================================
          Sticky top nav — thin ink band with back/forward links
          ============================================================ */}
      <nav
        className="sticky top-0 z-40 border-b-2 border-ink bg-cream/95 backdrop-blur-sm"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-3 sm:px-6">
          <Link
            href="/"
            className="group font-mono flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] text-ink-soft uppercase transition-colors hover:text-sauce sm:text-[11px]"
          >
            <span
              aria-hidden
              className="transition-transform group-hover:-translate-x-0.5"
            >
              &larr;
            </span>
            <span>Back to Map</span>
          </Link>
          <Link
            href="/routes"
            className="group font-mono flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] text-ink-soft uppercase transition-colors hover:text-sauce sm:text-[11px]"
          >
            <span>All Routes</span>
            <span
              aria-hidden
              className="transition-transform group-hover:translate-x-0.5"
            >
              &rarr;
            </span>
          </Link>
        </div>
      </nav>

      <article className="relative mx-auto max-w-3xl px-5 pt-10 pb-16 sm:pt-14">
        {/* ON RECORD stamp — rotated basil-green stamp in the upper
            right. Pops in last in the entrance sequence, signaling
            "this one's filed, not in motion." */}
        <div
          aria-hidden
          className="animate-stamp pointer-events-none absolute top-8 right-[-14px] sm:top-12 sm:right-4"
          style={{ animationDelay: '1050ms' }}
        >
          <div className="font-mono rotate-[5deg] border-[2.5px] border-basil bg-cream/85 px-3 py-1.5 text-center text-[9px] leading-[1.15] font-bold tracking-[0.22em] text-basil uppercase shadow-[3px_3px_0_rgba(77,91,42,0.22)] backdrop-blur-[1px] sm:text-[10px]">
            On
            <br />
            Record
          </div>
        </div>

        {/* ============================================================
            Hero masthead — "Route by / Creator Name"
            ============================================================ */}
        <header className="flex flex-col gap-3">
          <div
            className="font-mono animate-rise flex items-center justify-between gap-2 text-[10px] tracking-[0.22em] text-ink-soft uppercase sm:text-[11px]"
            style={{ animationDelay: '100ms' }}
          >
            <span>Route Dispatch &middot; Filed</span>
            <span className="hidden text-ink-faded sm:inline">
              Portland &middot; 2026
            </span>
          </div>

          <div
            className="animate-slash h-[3px] bg-ink"
            style={{ animationDelay: '180ms' }}
          />

          <h1
            className="font-display animate-rise leading-[0.85] tracking-[-0.03em] text-ink"
            style={{ animationDelay: '280ms' }}
          >
            <span className="block text-[clamp(3rem,13vw,5.5rem)] font-black">
              Route by
            </span>
            <span className="-mt-[0.08em] block text-[clamp(3rem,13vw,5.5rem)] font-black break-words text-sauce italic">
              {route.creatorDisplayName}
            </span>
          </h1>

          <div
            className="animate-slash h-[3px] bg-ink"
            style={{ animationDelay: '380ms' }}
          />

          <div
            className="font-mono animate-rise flex flex-wrap items-center justify-between gap-2 text-[10px] tracking-[0.2em] text-ink-soft uppercase sm:text-[11px]"
            style={{ animationDelay: '460ms' }}
          >
            <span>
              {stops.length} stops &middot; biking &middot; loops back to start
            </span>
            <span
              className="text-ink-faded"
              suppressHydrationWarning
            >
              Filed {createdAtText}
            </span>
          </div>
        </header>

        {/* ============================================================
            Stats infographic — Miles / Biking / Votes
            ============================================================ */}
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
          <Stat value={String(route.voteCount)} label="Votes" divider />
        </section>

        {/* ============================================================
            Embedded map — framed like a pinned photograph
            ============================================================ */}
        <figure
          className="animate-rise mt-8 flex flex-col"
          style={{ animationDelay: '720ms' }}
        >
          <div
            role="img"
            aria-label={`Map of the route by ${route.creatorDisplayName}`}
            className="relative h-[50vh] max-h-[540px] min-h-[320px] w-full border-[3px] border-ink bg-cream-deep shadow-[6px_6px_0_rgba(22,20,19,0.12)]"
          >
            <RouteDetailMap
              mapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ?? ''}
              encodedPolyline={route.encodedPolyline}
              stops={stops}
              origin={{ lat: route.originLat, lng: route.originLng }}
            />
          </div>
          <figcaption className="flex items-center justify-between border-x-[3px] border-b-[3px] border-ink bg-cream px-4 py-1.5">
            <span className="font-mono text-[9px] tracking-[0.22em] text-ink-soft uppercase">
              &#9662; Route
            </span>
            <span className="font-mono text-[9px] tracking-[0.22em] text-ink-soft uppercase">
              Via Google Bicycling
            </span>
          </figcaption>
        </figure>

        {/* ============================================================
            Ordered stops list
            ============================================================ */}
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
            As filed by {route.creatorDisplayName}. Begin at the origin and
            follow the sequence.
          </p>

          {stops.length === 0 ? (
            <div className="font-mono border border-dashed border-ink-faded/50 bg-cream-deep/30 px-4 py-3 text-[11px] tracking-[0.15em] text-ink-faded uppercase italic">
              &mdash; No stops on this route &mdash;
            </div>
          ) : (
            (() => {
              // First-stop-anchor semantics: for N stops, legs has
              // length N. stops[0] is the start (no leg-in); stops[i]
              // for i >= 1 uses legs[i-1]; the final return leg is
              // legs[N-1]. Routes saved before this change have a
              // different leg count and fall through to a no-legs
              // render.
              const legs = route.legDistancesMeters;
              const legDurs = route.legDurationsSeconds;
              const hasAnchorLegs =
                legs !== null &&
                legs.length === stops.length &&
                stops.length >= 2;

              return (
                <ol className="flex flex-col gap-2.5">
                  {stops.map((stop, i) => (
                    <StopCard
                      key={stop.id}
                      stop={stop}
                      index={i + 1}
                      isStart={hasAnchorLegs && i === 0}
                      legInMeters={
                        hasAnchorLegs && i > 0 ? legs![i - 1] : undefined
                      }
                      legInSeconds={
                        hasAnchorLegs && i > 0
                          ? legDurs?.[i - 1]
                          : undefined
                      }
                      legInLabel="From Previous"
                    />
                  ))}
                  {hasAnchorLegs && (
                    <ReturnLegRow
                      meters={legs![stops.length - 1]}
                      seconds={legDurs?.[stops.length - 1] ?? 0}
                    />
                  )}
                </ol>
              );
            })()
          )}

          {missingStops > 0 && (
            <p className="font-mono text-[9px] tracking-[0.18em] text-sauce uppercase">
              &middot; Note: {missingStops} stop{missingStops === 1 ? '' : 's'}{' '}
              no longer in the restaurant index and could not be shown.
            </p>
          )}
        </section>

        {/* ============================================================
            Vote + Delete stubs — Phase 6b wiring pending
            ============================================================ */}
        <section
          className="animate-rise mt-10 flex flex-col gap-3"
          style={{ animationDelay: '1000ms' }}
        >
          <div className="font-mono flex items-center gap-2 text-[10px] tracking-[0.22em] text-ink-soft uppercase">
            <span aria-hidden className="h-[2px] w-6 bg-ink" />
            <span>
              Current Votes:{' '}
              <span className="text-sauce">{route.voteCount}</span>
            </span>
            <span aria-hidden className="h-[2px] flex-1 bg-ink" />
          </div>

          <button
            type="button"
            disabled
            aria-disabled
            title="Voting lands in Phase 6b"
            className="font-mono flex cursor-not-allowed items-center justify-between border-2 border-dashed border-ink-faded bg-cream-deep/40 px-5 py-4 text-sm font-bold tracking-[0.18em] text-ink-faded uppercase sm:text-base"
          >
            <span>Vote for this Route</span>
            <span
              aria-hidden
              className="font-mono text-[9px] tracking-[0.2em] text-ink-faded/80"
            >
              Phase 6b
            </span>
          </button>

          {isCreator && (
            <button
              type="button"
              disabled
              aria-disabled
              title="Deleting routes lands in Phase 6b"
              className="font-mono flex cursor-not-allowed items-center justify-between border-2 border-dashed border-sauce/50 bg-cream px-5 py-4 text-sm font-bold tracking-[0.18em] text-sauce/70 uppercase sm:text-base"
            >
              <span>Delete Route</span>
              <span
                aria-hidden
                className="font-mono text-[9px] tracking-[0.2em] text-sauce/50"
              >
                Phase 6b &middot; Creator Only
              </span>
            </button>
          )}
        </section>

        {/* ============================================================
            Footer colophon
            ============================================================ */}
        <footer
          className="animate-rise mt-12 flex flex-col gap-2 border-t border-ink/30 pt-4"
          style={{ animationDelay: '1100ms' }}
        >
          <div className="font-mono flex items-center justify-between gap-3 text-[9px] tracking-[0.22em] text-ink-soft uppercase sm:text-[10px]">
            <span>Printed in PDX</span>
            <span>&sect;</span>
            <span>Route Dispatch</span>
          </div>
          <p className="font-mono text-center text-[8px] tracking-[0.2em] text-ink-faded uppercase">
            Biking directions via Google Directions API
          </p>
        </footer>
      </article>
    </main>
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

type StopCardProps = {
  stop: Restaurant;
  index: number;
  /** True for stop 01 — shows a "START HERE" badge instead of a leg-in. */
  isStart?: boolean;
  /** Distance from the previous stop to this stop, in meters. */
  legInMeters?: number;
  /** Duration for the same leg, in seconds. */
  legInSeconds?: number;
  /** Caption label for the leg-in row (unused when isStart=true). */
  legInLabel?: string;
};

function StopCard({
  stop,
  index,
  isStart,
  legInMeters,
  legInSeconds,
  legInLabel,
}: StopCardProps) {
  const hasLegIn = !isStart && typeof legInMeters === 'number';
  return (
    <li className="flex flex-col gap-2 border-[1.5px] border-ink bg-cream px-4 py-3 shadow-[3px_3px_0_rgba(22,20,19,0.08)]">
      {/* Start-here badge: stop 01 in the new "first stop is the
          anchor" semantics has no arrival leg — it's where you begin.
          Marked with a sauce-red star so the starting point is visible
          at a glance when scrolling the list. */}
      {isStart && (
        <div className="font-mono flex items-center gap-2 border-b border-sauce/50 pb-2 text-[9px] tracking-[0.22em] uppercase">
          <span aria-hidden className="text-sauce">
            &#x2605;
          </span>
          <span className="font-bold text-sauce">Start Here</span>
          <span aria-hidden className="text-ink-faded/60">
            &middot;
          </span>
          <span className="text-ink-soft">Anchor of the loop</span>
        </div>
      )}

      {/* Leg-in caption: how far and how long to reach THIS stop from
          the previous one. Omitted for the start stop (stop 01) and
          for legacy routes saved before leg data was persisted. */}
      {hasLegIn && (
        <div className="font-mono flex items-center gap-2 border-b border-ink/20 pb-2 text-[9px] tracking-[0.18em] text-ink-soft uppercase">
          <span aria-hidden className="text-sauce">
            &darr;
          </span>
          <span className="font-bold text-ink-soft">{legInLabel}</span>
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
        <a
          href={stop.everoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono group shrink-0 text-[9px] tracking-[0.2em] text-ink-soft/80 uppercase transition-colors hover:text-sauce"
        >
          Source{' '}
          <span
            aria-hidden
            className="inline-block transition-transform group-hover:translate-x-0.5"
          >
            &rarr;
          </span>
        </a>
      </div>
    </li>
  );
}

/* =========================================================================
   ReturnLegRow — terminal row showing the return-to-origin leg
   ========================================================================= */

function ReturnLegRow({
  meters,
  seconds,
}: {
  meters: number;
  seconds: number;
}) {
  return (
    <li
      aria-label={`Return to the starting stop: ${formatMilesShort(meters)} miles, ${formatMinutesShort(seconds)}`}
      className="font-mono flex items-center gap-2 border-[1.5px] border-dashed border-ink/50 bg-cream-deep/30 px-4 py-2 text-[9px] tracking-[0.18em] text-ink-soft uppercase"
    >
      <span aria-hidden className="text-sauce">
        &#x21BA;
      </span>
      <span className="font-bold text-ink-soft">Back to Start</span>
      <span aria-hidden className="text-ink-faded/60">
        &middot;
      </span>
      <span className="font-bold text-ink">
        {formatMilesShort(meters)} mi
      </span>
      <span aria-hidden className="text-ink-faded/60">
        &middot;
      </span>
      <span className="text-ink-soft">{formatMinutesShort(seconds)}</span>
    </li>
  );
}

/* =========================================================================
   Small formatters — short forms for leg captions
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

/* =========================================================================
   Duration helper — same shape as PlotModeSheet's formatter
   ========================================================================= */

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
