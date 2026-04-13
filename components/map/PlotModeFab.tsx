'use client';

type PlotModeFabProps = {
  active: boolean;
  onToggle: () => void;
};

/**
 * Floating "Plot Route" button. Only visible when plot mode is OFF.
 * When plot mode is active, the exit button is rendered inside the
 * PlotModeSheet's portal (same stacking context as the sheet) so it
 * sits above the backdrop-blur overlay.
 */
export function PlotModeFab({ active, onToggle }: PlotModeFabProps) {
  if (active) return null;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label="Plot a biking route between your starred restaurants"
      className="font-mono fixed right-4 z-40 flex items-center gap-2 rotate-[2deg] border-[2.5px] border-ink bg-cream px-3 py-2 text-[10px] font-bold tracking-[0.2em] text-ink uppercase shadow-[3px_3px_0_rgba(22,20,19,0.3)] transition-all duration-150 hover:bg-mustard hover:shadow-[5px_5px_0_rgba(22,20,19,0.4)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sauce sm:px-4 sm:py-2.5 sm:text-[11px]"
      style={{ top: 'calc(env(safe-area-inset-top) + 78px)' }}
    >
      <span aria-hidden className="text-sm leading-none">
        &#x2197;
      </span>
      <span>Plot Route</span>
    </button>
  );
}
