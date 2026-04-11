'use client';

import { useEffect, useState } from 'react';
import { Drawer } from 'vaul';
import type { Restaurant } from '@/lib/types';
import type { PlotStatus, PlotResult } from '@/lib/maps/use-plot-route';
import { MAX_WAYPOINTS } from '@/lib/maps/use-plot-route';

type PlotModeSheetProps = {
  /** Whether plot mode is active (controls drawer open/close). */
  open: boolean;
  /** Called when the user closes/exits the sheet. */
  onExit: () => void;
  /** Current state from usePlotRoute. */
  status: PlotStatus;
  result: PlotResult | null;
  error: string | null;
  starredCount: number;
  /**
   * The stops to display in the ordered list. Comes from the parent's
   * `manualOrder ?? result.orderedStops` so the list reflects the
   * user's reordering immediately (before the route has recomputed).
   */
  displayStops: Restaurant[];
  /** True when the user has manually reordered (controls the Reset link). */
  isManualOrder: boolean;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onResetOrder: () => void;
};

/**
 * The Plot Mode drawer — a broadsheet "route dispatch" card that
 * shows different content based on the plot status and, when ready,
 * displays the computed distance, duration, and ordered stops.
 *
 * Same vaul pattern as RestaurantSheet but with its own content
 * shape and a status-driven body.
 */
export function PlotModeSheet({
  open,
  onExit,
  status,
  result,
  error,
  starredCount,
  displayStops,
  isManualOrder,
  onMoveUp,
  onMoveDown,
  onResetOrder,
}: PlotModeSheetProps) {
  // Track whether we still have meaningful content to render so the
  // sheet doesn't flash empty during the close animation (~400ms).
  // When `open` goes false, we hold onto `hasOpenedOnce` until the
  // timer fires so PlotContent can keep rendering during the slide-out.
  const [hasContent, setHasContent] = useState(false);

  useEffect(() => {
    if (open) {
      setHasContent(true);
    } else {
      const timer = setTimeout(() => setHasContent(false), 400);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) onExit();
      }}
      // Single snap point at 92% height — plot mode is a focused
      // task, so we want the sheet dominant when it opens rather than
      // making the user drag it up to read the stops list.
      snapPoints={[0.92]}
      // dismissible={false} disables vaul's drag-to-dismiss and
      // overlay-click-to-dismiss behavior. The only way out of plot
      // mode is the explicit "Exit Plot Mode" button below — this
      // stops accidental closes while scrolling the stops list.
      dismissible={false}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-ink/45 backdrop-blur-[2px]" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed right-0 bottom-0 left-0 z-50 flex max-h-[94vh] flex-col border-t-[3px] border-ink bg-cream shadow-[0_-24px_48px_rgba(22,20,19,0.4)] outline-none"
        >
          {/* No drag handle — this sheet is non-dismissible, so
              showing a grabber bar would be a misleading affordance.
              The heavy 3px top border is the only visual anchor. */}

          {hasContent ? (
            <PlotContent
              status={status}
              result={result}
              error={error}
              starredCount={starredCount}
              displayStops={displayStops}
              isManualOrder={isManualOrder}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onResetOrder={onResetOrder}
              onExit={onExit}
            />
          ) : (
            <>
              <Drawer.Title className="sr-only">Plot route</Drawer.Title>
              <Drawer.Description className="sr-only">
                Toggle plot mode to compute a biking route.
              </Drawer.Description>
            </>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

/* =========================================================================
   PlotContent — status-dependent body
   ========================================================================= */

type PlotContentProps = {
  status: PlotStatus;
  result: PlotResult | null;
  error: string | null;
  starredCount: number;
  displayStops: Restaurant[];
  isManualOrder: boolean;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onResetOrder: () => void;
  onExit: () => void;
};

function PlotContent({
  status,
  result,
  error,
  starredCount,
  displayStops,
  isManualOrder,
  onMoveUp,
  onMoveDown,
  onResetOrder,
  onExit,
}: PlotContentProps) {
  // If we have a result AND stops to show, render the full ready
  // content even when status is 'computing' — that way reorders
  // don't blow the user back to a "Plotting…" spinner every time.
  // The stats section gets dimmed via the isRecomputing flag.
  if (result && displayStops.length > 0) {
    return (
      <ReadyContent
        result={result}
        stops={displayStops}
        isManualOrder={isManualOrder}
        isRecomputing={status === 'computing'}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onResetOrder={onResetOrder}
        onExit={onExit}
      />
    );
  }

  // Non-ready states share a common broadsheet-notice layout.
  const notice = getNoticeCopy(status, error, starredCount);
  return (
    <NoticeContent
      dateline={notice.dateline}
      titleTop={notice.titleTop}
      titleItalic={notice.titleItalic}
      body={notice.body}
      footnote={notice.footnote}
      onExit={onExit}
    />
  );
}

/* =========================================================================
   READY — the big one
   ========================================================================= */

type ReadyContentProps = {
  result: PlotResult;
  stops: Restaurant[];
  isManualOrder: boolean;
  isRecomputing: boolean;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onResetOrder: () => void;
  onExit: () => void;
};

function ReadyContent({
  result,
  stops,
  isManualOrder,
  isRecomputing,
  onMoveUp,
  onMoveDown,
  onResetOrder,
  onExit,
}: ReadyContentProps) {
  const miles = result.totalDistanceMeters / 1609.344;
  const durationText = formatDuration(result.totalDurationSeconds);

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col overflow-y-auto">
      {/* Dateline — flips to "Recomputing" when a reorder is in flight */}
      <div className="flex items-center justify-between border-y border-ink/30 bg-cream-deep/50 px-5 py-1.5">
        <span
          className="font-mono animate-rise text-[9px] font-bold tracking-[0.22em] text-ink-soft uppercase"
          style={{ animationDelay: '50ms' }}
        >
          &#x2726; Pizza Week 2026
        </span>
        <span
          className={`font-mono animate-rise text-[9px] tracking-[0.22em] uppercase transition-colors ${
            isRecomputing ? 'text-sauce' : 'text-ink-soft'
          }`}
          style={{ animationDelay: '100ms' }}
        >
          {isRecomputing ? 'Recomputing\u2026' : 'Route Dispatch'}
        </span>
      </div>

      <div className="flex flex-col gap-5 px-5 py-5">
        {/* Title */}
        <section
          className="animate-rise flex flex-col gap-1.5"
          style={{ animationDelay: '180ms' }}
        >
          <span className="font-mono text-[9px] font-bold tracking-[0.28em] text-sauce uppercase">
            &#x2500;&#x2500;&#x2500;{' '}
            {isManualOrder ? 'Your Custom Route' : 'The Route'}{' '}
            &#x2500;&#x2500;&#x2500;
          </span>
          <Drawer.Title className="font-display text-[clamp(2rem,8vw,3rem)] leading-[0.9] font-black tracking-[-0.02em] text-ink">
            Your Pizza{' '}
            <span className="text-sauce italic">Crawl</span>
          </Drawer.Title>
          <Drawer.Description className="font-mono text-[10px] tracking-[0.2em] text-ink-soft uppercase">
            {stops.length} stops &middot; biking &middot; loops back to start
          </Drawer.Description>
        </section>

        <div
          className="animate-slash h-[2px] bg-ink"
          style={{ animationDelay: '260ms' }}
        />

        {/* Stats row — dims slightly while a recompute is in flight
            so the user has visual feedback that the numbers will
            update once Google comes back. */}
        <section
          className={`animate-rise grid grid-cols-3 gap-2 border-y-2 border-ink py-4 transition-opacity duration-150 ${
            isRecomputing ? 'opacity-50' : 'opacity-100'
          }`}
          style={{ animationDelay: '320ms' }}
          aria-label="Route statistics"
          aria-busy={isRecomputing}
        >
          <Stat value={miles.toFixed(1)} label="Miles" />
          <Stat value={durationText.value} label={durationText.label} divider />
          <Stat value={String(stops.length)} label="Stops" divider />
        </section>

        {/* Ordered stops with reorder controls */}
        <section
          className="animate-rise flex flex-col gap-3"
          style={{ animationDelay: '400ms' }}
        >
          <div className="flex items-center gap-3">
            <span aria-hidden className="h-[2px] w-6 bg-ink sm:w-8" />
            <h3 className="font-mono text-[10px] font-bold tracking-[0.25em] text-ink uppercase">
              In Order
            </h3>
            <span aria-hidden className="h-[2px] flex-1 bg-ink" />
            {isManualOrder && (
              <button
                type="button"
                onClick={onResetOrder}
                className="font-mono flex items-center gap-1 border border-ink bg-cream px-2 py-1 text-[9px] font-bold tracking-[0.18em] text-ink uppercase transition-colors hover:bg-mustard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sauce"
                aria-label="Reset to Google's optimal order"
              >
                <span aria-hidden>&#x21BA;</span>
                <span>Reset</span>
              </button>
            )}
          </div>

          <p className="font-mono text-[9px] tracking-[0.15em] text-ink-soft/70 uppercase italic">
            {isManualOrder
              ? 'Custom order. Drag arrows to rearrange stops.'
              : 'Google optimized. Tap arrows to customize the order.'}
          </p>

          <ol className="flex flex-col gap-2">
            {stops.map((stop, i) => (
              <StopCard
                key={stop.id}
                stop={stop}
                index={i}
                totalStops={stops.length}
                onMoveUp={onMoveUp}
                onMoveDown={onMoveDown}
              />
            ))}
          </ol>
        </section>

        {/* Save + Exit actions */}
        <section
          className="animate-rise flex flex-col gap-3"
          style={{ animationDelay: '520ms' }}
        >
          <button
            type="button"
            disabled
            aria-disabled
            title="Saving routes lands in Phase 6"
            className="font-mono relative flex cursor-not-allowed items-center justify-between border-2 border-dashed border-ink-faded bg-cream-deep/40 px-5 py-4 text-sm font-bold tracking-[0.18em] text-ink-faded uppercase sm:text-base"
          >
            <span>Save Route</span>
            <span
              aria-hidden
              className="font-mono text-[9px] tracking-[0.2em] text-ink-faded/80"
            >
              Phase 6
            </span>
          </button>

          <button
            type="button"
            onClick={onExit}
            className="group font-mono flex items-center justify-between border-2 border-ink bg-cream px-5 py-4 text-sm font-bold tracking-[0.18em] text-ink uppercase transition-colors hover:border-ink hover:bg-ink hover:text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sauce sm:text-base"
          >
            <span
              aria-hidden
              className="transition-transform group-hover:-translate-x-1"
            >
              &larr;
            </span>
            <span>Exit Plot Mode</span>
            <span aria-hidden className="w-4" />
          </button>
        </section>

        <footer className="flex items-center justify-between gap-3 border-t border-ink/30 pt-3 pb-4">
          <span className="font-mono text-[9px] tracking-[0.22em] text-ink-soft/70 uppercase">
            Route via Google Directions &mdash; Bicycling
          </span>
          <span className="font-mono text-[9px] tracking-[0.22em] text-ink-soft/60 uppercase">
            &sect;
          </span>
        </footer>
      </div>
    </div>
  );
}

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
      <span className="font-display text-[clamp(1.75rem,7vw,2.5rem)] leading-none font-black tracking-[-0.02em] text-ink">
        {value}
      </span>
      <span className="font-mono text-[9px] font-bold tracking-[0.22em] text-ink-soft uppercase">
        {label}
      </span>
    </div>
  );
}

function StopCard({
  stop,
  index,
  totalStops,
  onMoveUp,
  onMoveDown,
}: {
  stop: Restaurant;
  index: number;
  totalStops: number;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}) {
  const isFirst = index === 0;
  const isLast = index === totalStops - 1;

  return (
    <li className="flex items-stretch gap-3 border-[1.5px] border-ink bg-cream px-3 py-2.5">
      <span
        aria-hidden
        className="font-mono flex shrink-0 items-start bg-ink px-2 py-1 text-[11px] font-bold tracking-[0.1em] text-cream"
      >
        {String(index + 1).padStart(2, '0')}
      </span>
      <div className="min-w-0 flex-1 self-center">
        <p className="font-display text-[15px] leading-tight font-bold text-ink sm:text-base">
          {stop.pizzaName}
        </p>
        <p className="font-mono mt-0.5 truncate text-[9px] tracking-[0.15em] text-ink-soft uppercase">
          {stop.name}
          {stop.neighborhood ? (
            <span className="text-ink-faded"> &middot; {stop.neighborhood}</span>
          ) : null}
        </p>
      </div>
      <div className="flex shrink-0 flex-col gap-1 self-center">
        <button
          type="button"
          onClick={() => onMoveUp(index)}
          disabled={isFirst}
          aria-label={`Move ${stop.pizzaName} up`}
          className="font-mono flex size-8 items-center justify-center border border-ink bg-cream text-[13px] leading-none text-ink transition-colors hover:bg-mustard disabled:cursor-not-allowed disabled:border-ink/30 disabled:bg-cream-deep/40 disabled:text-ink-faded/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sauce"
        >
          &uarr;
        </button>
        <button
          type="button"
          onClick={() => onMoveDown(index)}
          disabled={isLast}
          aria-label={`Move ${stop.pizzaName} down`}
          className="font-mono flex size-8 items-center justify-center border border-ink bg-cream text-[13px] leading-none text-ink transition-colors hover:bg-mustard disabled:cursor-not-allowed disabled:border-ink/30 disabled:bg-cream-deep/40 disabled:text-ink-faded/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sauce"
        >
          &darr;
        </button>
      </div>
    </li>
  );
}

/* =========================================================================
   NOTICE — the shared layout for all non-ready states
   ========================================================================= */

type NoticeCopy = {
  dateline: string;
  titleTop: string;
  titleItalic: string;
  body: string;
  footnote: string | null;
};

function getNoticeCopy(
  status: PlotStatus,
  error: string | null,
  starredCount: number,
): NoticeCopy {
  switch (status) {
    case 'too-few':
      return {
        dateline: 'Route Dispatch · Insufficient Stops',
        titleTop: 'Pick',
        titleItalic: 'More Pizzas',
        body: `Star at least two restaurants and we\u2019ll plot a biking route between them. You currently have ${starredCount} starred.`,
        footnote: 'Tap pins on the map to open a restaurant and hit the Star stamp.',
      };
    case 'too-many':
      return {
        dateline: 'Route Dispatch · Over Capacity',
        titleTop: 'Too Many',
        titleItalic: 'Stops',
        body: `Google Directions caps routes at ${MAX_WAYPOINTS} stops per request. You have ${starredCount} starred. Unstar a few and we\u2019ll try again.`,
        footnote: null,
      };
    case 'needs-origin':
      return {
        dateline: 'Route Dispatch · Locating',
        titleTop: 'Finding',
        titleItalic: 'You',
        body: 'Requesting your location so we can start the route from where you are standing. Allow the browser prompt, or we\u2019ll fall back to the first starred stop.',
        footnote: null,
      };
    case 'loading':
      return {
        dateline: 'Route Dispatch · Warming Up',
        titleTop: 'Loading',
        titleItalic: 'Directions',
        body: 'Fetching the Google Directions library. Give it a second\u2026',
        footnote: null,
      };
    case 'computing':
      return {
        dateline: 'Route Dispatch · Plotting',
        titleTop: 'Plotting',
        titleItalic: 'Your Route',
        body: 'Asking Google Directions for the optimal biking order between your starred stops\u2026',
        footnote: null,
      };
    case 'error':
      return {
        dateline: 'Route Dispatch · Ink Smeared',
        titleTop: 'Route',
        titleItalic: 'Failed',
        body:
          error ??
          'The Directions API returned an error. Try exiting plot mode and turning it on again.',
        footnote: null,
      };
    default:
      return {
        dateline: 'Route Dispatch',
        titleTop: 'Plot',
        titleItalic: 'Mode',
        body: '',
        footnote: null,
      };
  }
}

function NoticeContent({
  dateline,
  titleTop,
  titleItalic,
  body,
  footnote,
  onExit,
}: NoticeCopy & { onExit: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col overflow-y-auto">
      <div className="flex items-center justify-between border-y border-ink/30 bg-cream-deep/50 px-5 py-1.5">
        <span
          className="font-mono animate-rise text-[9px] font-bold tracking-[0.22em] text-ink-soft uppercase"
          style={{ animationDelay: '50ms' }}
        >
          {dateline}
        </span>
        <span
          className="font-mono animate-rise text-[9px] tracking-[0.22em] text-ink-soft uppercase"
          style={{ animationDelay: '100ms' }}
        >
          Pizza Week 2026
        </span>
      </div>

      <div className="flex flex-col gap-5 px-5 py-6">
        <div
          className="animate-slash h-[3px] bg-ink"
          style={{ animationDelay: '160ms' }}
        />

        <Drawer.Title
          className="font-display animate-rise text-[clamp(2.25rem,10vw,3.5rem)] leading-[0.88] font-black tracking-[-0.03em] text-ink"
          style={{ animationDelay: '240ms' }}
        >
          {titleTop}
          <span className="block text-sauce italic">{titleItalic}</span>
        </Drawer.Title>

        <div
          className="animate-slash h-[3px] bg-ink"
          style={{ animationDelay: '320ms' }}
        />

        <Drawer.Description
          className="font-display animate-rise text-base leading-relaxed text-ink-soft sm:text-[17px]"
          style={{ animationDelay: '440ms' }}
        >
          {body}
        </Drawer.Description>

        {footnote && (
          <div
            className="animate-rise border-l-[3px] border-sauce pl-3"
            style={{ animationDelay: '520ms' }}
          >
            <p className="font-display text-sm leading-relaxed text-ink-faded italic sm:text-[15px]">
              {footnote}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={onExit}
          className="group font-mono animate-rise mt-2 flex items-center justify-between border-2 border-ink bg-cream px-5 py-4 text-sm font-bold tracking-[0.18em] text-ink uppercase transition-colors hover:border-ink hover:bg-ink hover:text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sauce sm:text-base"
          style={{ animationDelay: '600ms' }}
        >
          <span
            aria-hidden
            className="transition-transform group-hover:-translate-x-1"
          >
            &larr;
          </span>
          <span>Exit Plot Mode</span>
          <span aria-hidden className="w-4" />
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
   Helpers
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
