import Link from 'next/link';
import { verifySession } from '@/lib/auth/dal';
import { getAllRoutes } from '@/lib/firebase/routes';
import type { Route } from '@/lib/types';

/**
 * Saved Routes list — MINIMAL Phase 6a version.
 *
 * Phase 6b will replace this with a polished sortable/filterable
 * design, voting integration, and richer cards. For now this is a
 * functional broadsheet list that lets users browse and navigate
 * to /routes/[id] detail pages.
 */
export default async function RoutesListPage() {
  await verifySession();
  const routes = await getAllRoutes();

  return (
    <main className="relative min-h-dvh">
      {/* Sticky top nav — mirrors the detail page */}
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
          <span className="font-mono text-[10px] tracking-[0.2em] text-ink-faded uppercase sm:text-[11px]">
            Phase 6a &middot; Minimal List
          </span>
        </div>
      </nav>

      <article className="mx-auto max-w-3xl px-5 pt-10 pb-16 sm:pt-14">
        {/* Hero masthead */}
        <header className="flex flex-col gap-3">
          <div
            className="font-mono animate-rise text-[10px] tracking-[0.22em] text-ink-soft uppercase sm:text-[11px]"
            style={{ animationDelay: '100ms' }}
          >
            Route Archive &middot; All Filed Dispatches
          </div>

          <div
            className="animate-slash h-[3px] bg-ink"
            style={{ animationDelay: '180ms' }}
          />

          <h1
            className="font-display animate-rise leading-[0.85] tracking-[-0.03em] text-ink"
            style={{ animationDelay: '280ms' }}
          >
            <span className="block text-[clamp(3.5rem,16vw,6rem)] font-black">
              Saved
            </span>
            <span className="-mt-[0.08em] block text-[clamp(3.5rem,16vw,6rem)] font-black text-sauce italic">
              Routes
            </span>
          </h1>

          <div
            className="animate-slash h-[3px] bg-ink"
            style={{ animationDelay: '380ms' }}
          />

          <div
            className="font-mono animate-rise flex items-center justify-between gap-2 text-[10px] tracking-[0.2em] text-ink-soft uppercase sm:text-[11px]"
            style={{ animationDelay: '460ms' }}
          >
            <span>
              {routes.length} route{routes.length === 1 ? '' : 's'} on record
            </span>
            <span className="text-ink-faded">Most recent first</span>
          </div>
        </header>

        {/* Route list */}
        <section
          className="animate-rise mt-10 flex flex-col gap-3"
          style={{ animationDelay: '580ms' }}
          aria-label="Saved routes"
        >
          {routes.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="flex flex-col gap-3">
              {routes.map((route) => (
                <RouteCard key={route.id} route={route} />
              ))}
            </ul>
          )}
        </section>

        {/* Footer colophon */}
        <footer className="mt-12 flex flex-col gap-2 border-t border-ink/30 pt-4">
          <div className="font-mono flex items-center justify-between gap-3 text-[9px] tracking-[0.22em] text-ink-soft uppercase sm:text-[10px]">
            <span>Printed in PDX</span>
            <span>&sect;</span>
            <span>Route Archive</span>
          </div>
          <p className="font-mono text-center text-[8px] tracking-[0.2em] text-ink-faded uppercase">
            Sortable list + voting land in Phase 6b
          </p>
        </footer>
      </article>
    </main>
  );
}

/* =========================================================================
   RouteCard — a single row in the list
   ========================================================================= */

function RouteCard({ route }: { route: Route }) {
  const miles = (route.totalDistanceMeters / 1609.344).toFixed(1);
  const durationText = formatDurationShort(route.totalDurationSeconds);
  const createdAtText = new Date(route.createdAt).toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <li>
      <Link
        href={`/routes/${route.id}`}
        className="group flex flex-col gap-3 border-[2px] border-ink bg-cream px-4 py-4 shadow-[3px_3px_0_rgba(22,20,19,0.08)] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0_rgba(22,20,19,0.14)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sauce"
      >
        {/* Top row: creator name + vote count */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[9px] font-bold tracking-[0.22em] text-ink-soft uppercase">
              Route by
            </p>
            <p className="font-display text-xl leading-tight font-bold break-words text-ink sm:text-2xl">
              <span className="text-sauce italic">
                {route.creatorDisplayName}
              </span>
            </p>
          </div>
          <div className="font-mono shrink-0 border border-ink bg-cream-deep px-2 py-1 text-center">
            <div className="text-[15px] font-black text-ink">
              {route.voteCount}
            </div>
            <div className="text-[8px] tracking-[0.2em] text-ink-soft uppercase">
              Votes
            </div>
          </div>
        </div>

        {/* Middle row: mini stats */}
        <div className="font-mono flex flex-wrap items-center gap-x-4 gap-y-1 border-y border-ink/30 py-2 text-[10px] tracking-[0.18em] text-ink-soft uppercase">
          <span>
            <span className="font-bold text-ink">{miles}</span> mi
          </span>
          <span aria-hidden>&middot;</span>
          <span>
            <span className="font-bold text-ink">{durationText}</span> biking
          </span>
          <span aria-hidden>&middot;</span>
          <span>
            <span className="font-bold text-ink">
              {route.stopRestaurantIds.length}
            </span>{' '}
            stops
          </span>
        </div>

        {/* Bottom row: dateline + open affordance */}
        <div className="flex items-center justify-between gap-3">
          <span
            className="font-mono text-[9px] tracking-[0.18em] text-ink-faded uppercase"
            suppressHydrationWarning
          >
            Filed {createdAtText}
          </span>
          <span
            aria-hidden
            className="font-mono text-[10px] tracking-[0.18em] text-ink-soft/70 uppercase transition-all group-hover:text-sauce"
          >
            Open{' '}
            <span className="inline-block transition-transform group-hover:translate-x-0.5">
              &rarr;
            </span>
          </span>
        </div>
      </Link>
    </li>
  );
}

/* =========================================================================
   EmptyState — shown when no routes exist yet
   ========================================================================= */

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 border-[2.5px] border-dashed border-ink/40 bg-cream-deep/30 p-8 text-center">
      <p className="font-display text-2xl leading-tight font-bold text-ink sm:text-3xl">
        No routes{' '}
        <span className="text-sauce italic">yet</span>
      </p>
      <p className="font-display text-sm leading-relaxed text-ink-soft sm:text-base">
        Open the map, star a few pizzas, tap the{' '}
        <span className="font-mono text-[11px] tracking-wider text-sauce uppercase">
          Plot Route
        </span>{' '}
        stamp, and hit{' '}
        <span className="font-mono text-[11px] tracking-wider text-ink uppercase">
          Save Route
        </span>{' '}
        to file your first dispatch.
      </p>
      <Link
        href="/"
        className="group font-mono mt-2 flex items-center justify-between border-2 border-ink bg-cream px-5 py-3 text-sm font-bold tracking-[0.18em] text-ink uppercase transition-colors hover:border-ink hover:bg-ink hover:text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sauce"
      >
        <span
          aria-hidden
          className="mr-2 transition-transform group-hover:-translate-x-0.5"
        >
          &larr;
        </span>
        <span>Back to the Map</span>
      </Link>
    </div>
  );
}

/* =========================================================================
   Duration helper — short format for list rows
   ========================================================================= */

function formatDurationShort(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h${mins}m`;
}
