'use client';

type PlotModeFabProps = {
  active: boolean;
  onToggle: () => void;
};

/**
 * Floating toggle for Plot Route mode.
 *
 * Positioned top-right below the MapHeader so it's always visible
 * regardless of whether a bottom sheet is open. When plot mode is
 * inactive, the button is a cream-on-ink stamp tilted slightly
 * clockwise ("Plot Route"). When active, it flips to sauce-red and
 * counter-tilts ("Exit Plot") so the state is unambiguous at a
 * glance.
 */
export function PlotModeFab({ active, onToggle }: PlotModeFabProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      aria-label={
        active
          ? 'Exit plot route mode'
          : 'Plot a biking route between your starred restaurants'
      }
      className={`font-mono fixed right-4 z-40 flex items-center gap-2 border-[2.5px] px-3 py-2 text-[10px] font-bold tracking-[0.2em] uppercase shadow-[3px_3px_0_rgba(22,20,19,0.3)] transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sauce sm:px-4 sm:py-2.5 sm:text-[11px] ${
        active
          ? 'rotate-[-3deg] border-sauce bg-sauce text-cream hover:shadow-[5px_5px_0_rgba(124,19,8,0.4)]'
          : 'rotate-[2deg] border-ink bg-cream text-ink hover:bg-mustard hover:shadow-[5px_5px_0_rgba(22,20,19,0.4)]'
      }`}
      style={{ top: 'calc(env(safe-area-inset-top) + 78px)' }}
    >
      <span aria-hidden className="text-sm leading-none">
        {active ? '\u2715' : '\u2197'}
      </span>
      <span>{active ? 'Exit Plot' : 'Plot Route'}</span>
    </button>
  );
}
