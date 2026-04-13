'use client';

import { APIProvider } from '@vis.gl/react-google-maps';
import { useCustomLegs } from '@/lib/maps/use-custom-legs';
import type { Restaurant, UserLocation } from '@/lib/types';

type RouteDetailStopListProps = {
  mapsApiKey: string;
  stops: Restaurant[];
  legDistancesMeters: number[] | null;
  legDurationsSeconds: number[] | null;
  userLocation: UserLocation | null;
};

/**
 * Client component that renders the ordered stop list for a saved
 * route, with inline Home Start/End cards and leg dividers when the
 * user has a home location set — matching the plot mode layout.
 *
 * Wraps itself in APIProvider so useCustomLegs can call Google
 * Directions for the home-to-first and last-to-home legs.
 */
export function RouteDetailStopList({
  mapsApiKey,
  stops,
  legDistancesMeters,
  legDurationsSeconds,
  userLocation,
}: RouteDetailStopListProps) {
  if (!mapsApiKey || stops.length === 0) {
    return <StopListInner stops={stops} legDistancesMeters={legDistancesMeters} legDurationsSeconds={legDurationsSeconds} userLocation={null} customLegs={null} />;
  }

  if (!userLocation) {
    return <StopListInner stops={stops} legDistancesMeters={legDistancesMeters} legDurationsSeconds={legDurationsSeconds} userLocation={null} customLegs={null} />;
  }

  return (
    <APIProvider apiKey={mapsApiKey}>
      <StopListWithLegs stops={stops} legDistancesMeters={legDistancesMeters} legDurationsSeconds={legDurationsSeconds} userLocation={userLocation} />
    </APIProvider>
  );
}

function StopListWithLegs({
  stops,
  legDistancesMeters,
  legDurationsSeconds,
  userLocation,
}: {
  stops: Restaurant[];
  legDistancesMeters: number[] | null;
  legDurationsSeconds: number[] | null;
  userLocation: UserLocation;
}) {
  const { result: customLegs } = useCustomLegs({
    enabled: true,
    homeLocation: userLocation,
    firstStop: stops[0] ?? null,
    lastStop: stops.length > 0 ? stops[stops.length - 1] : null,
  });

  return (
    <StopListInner
      stops={stops}
      legDistancesMeters={legDistancesMeters}
      legDurationsSeconds={legDurationsSeconds}
      userLocation={userLocation}
      customLegs={customLegs}
    />
  );
}

function StopListInner({
  stops,
  legDistancesMeters,
  legDurationsSeconds,
  userLocation,
  customLegs,
}: {
  stops: Restaurant[];
  legDistancesMeters: number[] | null;
  legDurationsSeconds: number[] | null;
  userLocation: UserLocation | null;
  customLegs: {
    startLeg: { distanceMeters: number; durationSeconds: number } | null;
    endLeg: { distanceMeters: number; durationSeconds: number } | null;
  } | null;
}) {
  if (stops.length === 0) {
    return (
      <div className="font-mono border border-dashed border-ink-faded/50 bg-cream-deep/30 px-4 py-3 text-[11px] tracking-[0.15em] text-ink-faded uppercase italic">
        &mdash; No stops on this route &mdash;
      </div>
    );
  }

  const legs = legDistancesMeters;
  const legDurs = legDurationsSeconds;
  const hasLinearLegs =
    legs !== null &&
    legs.length === stops.length - 1 &&
    stops.length >= 2;
  const hasLegacyLoopLegs =
    legs !== null &&
    legs.length === stops.length &&
    stops.length >= 2;
  const hasLegs = hasLinearLegs || hasLegacyLoopLegs;

  return (
    <ol className="flex flex-col gap-2.5">
      {/* Home start card */}
      {userLocation && (
        <li className="flex items-center gap-3 border-[1.5px] border-dashed border-ink/40 bg-cream-deep/20 px-4 py-3">
          <span aria-hidden className="text-mustard text-sm">&#x2302;</span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[8px] font-bold tracking-[0.22em] text-mustard uppercase">Home &mdash; Start</p>
            <p className="font-mono mt-0.5 truncate text-[9px] tracking-[0.12em] text-ink-faded">{userLocation.formattedAddress}</p>
          </div>
        </li>
      )}

      {/* Leg from home to first stop */}
      {userLocation && customLegs?.startLeg && (
        <LegDivider
          meters={customLegs.startLeg.distanceMeters}
          seconds={customLegs.startLeg.durationSeconds}
          label="From Home"
        />
      )}

      {stops.map((stop, i) => (
        <StopCard
          key={stop.id}
          stop={stop}
          index={i + 1}
          isStart={hasLegs && i === 0}
          isEnd={hasLegs && i === stops.length - 1}
          legInMeters={hasLegs && i > 0 ? legs![i - 1] : undefined}
          legInSeconds={hasLegs && i > 0 ? legDurs?.[i - 1] : undefined}
          legInLabel="From Previous"
        />
      ))}

      {/* Leg from last stop to home */}
      {userLocation && customLegs?.endLeg && (
        <LegDivider
          meters={customLegs.endLeg.distanceMeters}
          seconds={customLegs.endLeg.durationSeconds}
          label="To Home"
        />
      )}

      {/* Home end card */}
      {userLocation && (
        <li className="flex items-center gap-3 border-[1.5px] border-dashed border-ink/40 bg-cream-deep/20 px-4 py-3">
          <span aria-hidden className="text-mustard text-sm">&#x2302;</span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[8px] font-bold tracking-[0.22em] text-mustard uppercase">Home &mdash; End</p>
            <p className="font-mono mt-0.5 truncate text-[9px] tracking-[0.12em] text-ink-faded">{userLocation.formattedAddress}</p>
          </div>
        </li>
      )}
    </ol>
  );
}

/* =========================================================================
   StopCard — mirrors the Server Component version from the parent page
   ========================================================================= */

function StopCard({
  stop,
  index,
  isStart,
  isEnd,
  legInMeters,
  legInSeconds,
  legInLabel,
}: {
  stop: Restaurant;
  index: number;
  isStart?: boolean;
  isEnd?: boolean;
  legInMeters?: number;
  legInSeconds?: number;
  legInLabel?: string;
}) {
  const hasLegIn = !isStart && typeof legInMeters === 'number';
  return (
    <li className="flex flex-col gap-2 border-[1.5px] border-ink bg-cream px-4 py-3 shadow-[3px_3px_0_rgba(22,20,19,0.08)]">
      {isStart && (
        <div className="font-mono flex items-center gap-2 border-b border-sauce/50 pb-2 text-[9px] tracking-[0.22em] uppercase">
          <span aria-hidden className="text-sauce">&#x2605;</span>
          <span className="font-bold text-sauce">Start</span>
          <span aria-hidden className="text-ink-faded/60">&middot;</span>
          <span className="text-ink-soft">The crawl begins here</span>
        </div>
      )}
      {isEnd && !isStart && (
        <div className="font-mono flex items-center gap-2 border-b border-ink/30 pb-2 text-[9px] tracking-[0.22em] uppercase">
          <span aria-hidden className="text-ink-soft">&#x2691;</span>
          <span className="font-bold text-ink-soft">Finish</span>
          <span aria-hidden className="text-ink-faded/60">&middot;</span>
          <span className="text-ink-faded">Last stop &mdash; disperse!</span>
        </div>
      )}

      {hasLegIn && (
        <div className="font-mono flex items-center gap-2 border-b border-ink/20 pb-2 text-[9px] tracking-[0.18em] text-ink-soft uppercase">
          <span aria-hidden className="text-sauce">&darr;</span>
          <span className="font-bold text-ink-soft">{legInLabel}</span>
          <span aria-hidden className="text-ink-faded/60">&middot;</span>
          <span className="font-bold text-ink">{formatMilesShort(legInMeters!)} mi</span>
          <span aria-hidden className="text-ink-faded/60">&middot;</span>
          <span className="text-ink-soft">{formatMinutesShort(legInSeconds ?? 0)}</span>
        </div>
      )}

      <div className="flex items-start gap-3">
        <span aria-hidden className="font-mono shrink-0 bg-ink px-2 py-1 text-[11px] font-bold tracking-[0.1em] text-cream">
          {String(index).padStart(2, '0')}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base leading-tight font-bold text-ink sm:text-lg">{stop.pizzaName}</p>
          <p className="font-mono mt-0.5 text-[10px] tracking-[0.15em] text-ink-soft uppercase">
            {stop.name}
            {stop.neighborhood ? <span className="text-ink-faded"> &middot; {stop.neighborhood}</span> : null}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-ink/20 pt-2">
        <span className="font-mono truncate text-[9px] tracking-[0.15em] text-ink-faded uppercase">{stop.address}</span>
        <a
          href={stop.everoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono group shrink-0 text-[9px] tracking-[0.2em] text-ink-soft/80 uppercase transition-colors hover:text-sauce"
        >
          Source{' '}
          <span aria-hidden className="inline-block transition-transform group-hover:translate-x-0.5">&rarr;</span>
        </a>
      </div>
    </li>
  );
}

/* =========================================================================
   LegDivider — distance/time between stops (or home↔stop)
   ========================================================================= */

function LegDivider({
  meters,
  seconds,
  label,
}: {
  meters: number;
  seconds: number;
  label?: string;
}) {
  return (
    <li
      aria-hidden
      className="font-mono flex items-center gap-2 px-1 py-1 text-[9px] tracking-[0.18em] text-ink-soft uppercase"
    >
      <span className="h-[1px] flex-1 bg-ink/20" />
      <span aria-hidden className="text-sauce">&darr;</span>
      {label && <span className="text-ink-faded">{label}</span>}
      <span className="font-bold text-ink">{formatMilesShort(meters)} mi</span>
      <span aria-hidden className="text-ink-faded/60">&middot;</span>
      <span>{formatMinutesShort(seconds)}</span>
      <span className="h-[1px] flex-1 bg-ink/20" />
    </li>
  );
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
