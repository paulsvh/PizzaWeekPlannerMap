'use client';

import type { Restaurant } from '@/lib/types';

type RestaurantMarkerProps = {
  restaurant: Restaurant;
  isSelected: boolean;
  isStarred: boolean;
};

/**
 * A pressmark-style pin that goes inside <AdvancedMarker>.
 *
 * Three visual states, composed from two independent bits:
 *
 *   - Unstarred, unselected: 28px ink-black dot, cream slice
 *   - Starred, unselected:   28px mustard dot, ink slice (inverted)
 *   - Selected (either):     44px pizza-sauce dot, cream slice +
 *                            pepperoni pips, animate-marker-pop, ping halo
 *
 * Mustard pins POP against the default Google Maps basemap so the
 * user can scan their shortlist at a glance without opening each pin.
 *
 * The offset drop shadows simulate letterpress ink — the color bleeds
 * slightly below the pin like a stamp pressed into newsprint.
 */
export function RestaurantMarker({
  restaurant,
  isSelected,
  isStarred,
}: RestaurantMarkerProps) {
  // Order matters: selected overrides starred. A selected pin looks
  // the same regardless of starred state, because the sheet opened
  // by selection shows the starred state explicitly via its own UI.
  const containerClass = isSelected
    ? 'size-11 bg-sauce shadow-[0_5px_0_rgba(124,19,8,0.55),0_10px_18px_rgba(22,20,19,0.4)] animate-marker-pop z-10'
    : isStarred
      ? 'size-7 bg-mustard shadow-[0_3px_0_rgba(124,97,10,0.6),0_4px_10px_rgba(22,20,19,0.3)] hover:scale-110'
      : 'size-7 bg-ink shadow-[0_3px_0_rgba(22,20,19,0.6),0_4px_10px_rgba(22,20,19,0.3)] hover:scale-110';

  const sliceSize = isSelected ? 'size-6' : 'size-4';
  const sliceColor = isSelected
    ? 'text-cream'
    : isStarred
      ? 'text-ink' // ink slice on mustard = high contrast, looks stamped
      : 'text-cream';

  const ariaLabel = isStarred
    ? `${restaurant.name} — ${restaurant.pizzaName} (starred)`
    : `${restaurant.name} — ${restaurant.pizzaName}`;

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={`relative flex items-center justify-center rounded-full transition-all duration-200 ease-out ${containerClass}`}
    >
      <svg
        viewBox="0 0 24 24"
        className={`${sliceSize} ${sliceColor}`}
        aria-hidden
      >
        {/* Wedge slice — pointy top, rounded bottom crust */}
        <path
          d="M12 3 L20.5 18.5 Q12 22.5 3.5 18.5 Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="0.4"
          strokeLinejoin="round"
        />
        {/* Pepperoni dots only appear on the big selected state */}
        {isSelected && (
          <g fill="#7c1308">
            <circle cx="9.8" cy="13" r="0.95" />
            <circle cx="14" cy="12.2" r="0.95" />
            <circle cx="12" cy="16.3" r="0.95" />
          </g>
        )}
      </svg>

      {/* Selected halo — a subtle pinging ring so the eye snaps to the pin */}
      {isSelected && (
        <span
          aria-hidden
          className="absolute inset-0 animate-ping rounded-full border-2 border-sauce/60"
        />
      )}
    </div>
  );
}
