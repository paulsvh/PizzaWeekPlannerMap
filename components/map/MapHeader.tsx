'use client';

import Link from 'next/link';
import { logout } from '@/app/login/actions';

type MapHeaderProps = { displayName: string; isAdmin: boolean };

/**
 * The floating running-head of the paper — pinned to the top of the
 * viewport, sitting over the map. Semi-transparent cream so the map
 * tile grid peeks through, heavy ink underline, masthead condensed
 * into a single strip.
 */
export function MapHeader({ displayName, isAdmin }: MapHeaderProps) {
  return (
    <header
      className="fixed top-0 right-0 left-0 z-40 border-b-2 border-ink bg-cream/90 backdrop-blur-sm"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-6 sm:py-3">
        {/* Masthead — condensed broadsheet title */}
        <div className="flex flex-col gap-0.5">
          <h1 className="font-display text-xl leading-none font-black tracking-[-0.02em] text-ink sm:text-2xl">
            Pizza <span className="text-sauce italic">Week</span>
          </h1>
          <div className="font-mono text-[8px] tracking-[0.22em] text-ink-soft uppercase sm:text-[9px]">
            Portland &nbsp;·&nbsp; Apr 20&mdash;26 &nbsp;·&nbsp; 2026
          </div>
        </div>

        {/* Right side: reader identity + routes link + sign out */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden flex-col items-end gap-0.5 sm:flex">
            <div className="font-mono text-[8px] tracking-[0.22em] text-ink-soft uppercase">
              Reader
            </div>
            <div className="font-display max-w-[140px] truncate text-sm font-bold text-ink">
              {displayName}
            </div>
          </div>

          <Link
            href="/routes"
            className="font-mono border-2 border-ink bg-cream px-3 py-1.5 text-[10px] font-bold tracking-[0.18em] text-ink uppercase transition-colors hover:border-mustard hover:bg-mustard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sauce sm:px-4 sm:py-2 sm:text-[11px]"
          >
            Routes
          </Link>

          {isAdmin && (
            <Link
              href="/admin"
              className="font-mono border-2 border-ink bg-cream px-3 py-1.5 text-[10px] font-bold tracking-[0.18em] text-ink uppercase transition-colors hover:border-basil hover:bg-basil hover:text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sauce sm:px-4 sm:py-2 sm:text-[11px]"
            >
              Admin
            </Link>
          )}

          <form action={logout}>
            <button
              type="submit"
              className="font-mono border-2 border-ink bg-cream px-3 py-1.5 text-[10px] font-bold tracking-[0.18em] text-ink uppercase transition-colors hover:border-sauce hover:bg-sauce hover:text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sauce sm:px-4 sm:py-2 sm:text-[11px]"
            >
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
