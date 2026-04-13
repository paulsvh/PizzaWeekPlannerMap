'use client';

import { APIProvider } from '@vis.gl/react-google-maps';
import { useCustomLegs } from '@/lib/maps/use-custom-legs';
import type { Restaurant, UserLocation } from '@/lib/types';

type RouteDetailHomeLegsProps = {
  mapsApiKey: string;
  userLocation: UserLocation;
  firstStop: Restaurant;
  lastStop: Restaurant;
};

/**
 * Client island that computes and displays the user's personal
 * travel legs (home → first stop, last stop → home) on the route
 * detail page. Wraps itself in an APIProvider so the useCustomLegs
 * hook can access the Google Directions library.
 *
 * Renders as dashed-border "From Home" / "To Home" cards that are
 * visually distinct from the shared route data.
 */
export function RouteDetailHomeLegs({
  mapsApiKey,
  userLocation,
  firstStop,
  lastStop,
}: RouteDetailHomeLegsProps) {
  if (!mapsApiKey) return null;

  return (
    <APIProvider apiKey={mapsApiKey}>
      <HomeLegsInner
        userLocation={userLocation}
        firstStop={firstStop}
        lastStop={lastStop}
      />
    </APIProvider>
  );
}

function HomeLegsInner({
  userLocation,
  firstStop,
  lastStop,
}: Omit<RouteDetailHomeLegsProps, 'mapsApiKey'>) {
  const { status, result } = useCustomLegs({
    enabled: true,
    homeLocation: userLocation,
    firstStop,
    lastStop,
  });

  if (status === 'computing') {
    return (
      <section
        className="animate-rise mt-8 flex flex-col gap-3"
        style={{ animationDelay: '920ms' }}
      >
        <SectionHeader />
        <p className="font-mono text-[9px] tracking-[0.18em] text-ink-faded uppercase italic">
          Computing travel from home&hellip;
        </p>
      </section>
    );
  }

  if (!result || (!result.startLeg && !result.endLeg)) return null;

  return (
    <section
      className="animate-rise mt-8 flex flex-col gap-3"
      style={{ animationDelay: '920ms' }}
    >
      <SectionHeader />

      <p className="font-mono text-[9px] tracking-[0.2em] text-ink-soft/70 uppercase italic">
        Personal travel &mdash; only you can see this
      </p>

      <div className="flex flex-col gap-2.5">
        {result.startLeg && (
          <HomeLegCard
            label="From Home"
            sublabel={`to ${firstStop.name}`}
            meters={result.startLeg.distanceMeters}
            seconds={result.startLeg.durationSeconds}
            address={userLocation.formattedAddress}
          />
        )}
        {result.endLeg && (
          <HomeLegCard
            label="To Home"
            sublabel={`from ${lastStop.name}`}
            meters={result.endLeg.distanceMeters}
            seconds={result.endLeg.durationSeconds}
            address={userLocation.formattedAddress}
          />
        )}
      </div>
    </section>
  );
}

function SectionHeader() {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="text-mustard">&#x2302;</span>
      <h2 className="font-mono text-[11px] font-bold tracking-[0.25em] text-ink uppercase sm:text-[12px]">
        Your Travel
      </h2>
      <span aria-hidden className="h-[2px] flex-1 bg-ink/30" />
    </div>
  );
}

function HomeLegCard({
  label,
  sublabel,
  meters,
  seconds,
  address,
}: {
  label: string;
  sublabel: string;
  meters: number;
  seconds: number;
  address: string;
}) {
  const miles = meters / 1609.344;
  const totalMinutes = Math.max(1, Math.round(seconds / 60));
  const timeStr =
    totalMinutes < 60
      ? `${totalMinutes} min`
      : `${Math.floor(totalMinutes / 60)}h${totalMinutes % 60 || ''}`;

  return (
    <div className="flex flex-col gap-2 border-[1.5px] border-dashed border-ink/50 bg-cream-deep/20 px-4 py-3">
      <div className="font-mono flex items-center gap-2 text-[9px] tracking-[0.22em] uppercase">
        <span aria-hidden className="text-mustard">&#x2302;</span>
        <span className="font-bold text-ink-soft">{label}</span>
        <span aria-hidden className="text-ink-faded/60">&middot;</span>
        <span className="text-ink-faded">{sublabel}</span>
      </div>
      <div className="font-mono flex items-center gap-3 text-[10px] tracking-[0.15em] text-ink-soft uppercase">
        <span className="font-bold text-ink">
          {miles < 0.1 ? '<0.1' : miles.toFixed(1)} mi
        </span>
        <span aria-hidden className="text-ink-faded/60">&middot;</span>
        <span>{timeStr} biking</span>
      </div>
      <p className="font-mono truncate text-[9px] tracking-[0.12em] text-ink-faded">
        {address}
      </p>
    </div>
  );
}
