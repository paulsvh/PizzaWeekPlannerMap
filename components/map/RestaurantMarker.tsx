'use client';

import type { Restaurant } from '@/lib/types';

type RestaurantMarkerProps = {
  restaurant: Restaurant;
  isSelected: boolean;
};

/**
 * A pressmark-style pin that goes inside <AdvancedMarker>.
 *
 * Default: 28px ink-black dot with a cream pizza slice SVG.
 * Selected: 44px pizza-sauce red dot with pepperoni detail, a ping halo,
 *           and a subtle scale-bounce on entry via animate-marker-pop.
 *
 * The offset drop shadows simulate letterpress ink — the black bleeds
 * slightly below the pin like a stamp pressed into newsprint.
 */
export function RestaurantMarker({
  restaurant,
  isSelected,
}: RestaurantMarkerProps) {
  return (
    <div
      role="img"
      aria-label={`${restaurant.name} — ${restaurant.pizzaName}`}
      className={`
        relative flex items-center justify-center rounded-full
        transition-all duration-200 ease-out
        ${
          isSelected
            ? 'size-11 bg-sauce shadow-[0_5px_0_rgba(124,19,8,0.55),0_10px_18px_rgba(22,20,19,0.4)] animate-marker-pop z-10'
            : 'size-7 bg-ink shadow-[0_3px_0_rgba(22,20,19,0.6),0_4px_10px_rgba(22,20,19,0.3)] hover:scale-110'
        }
      `}
    >
      <svg
        viewBox="0 0 24 24"
        className={`${isSelected ? 'size-6' : 'size-4'} text-cream`}
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
          className="absolute inset-0 rounded-full border-2 border-sauce/60 animate-ping"
        />
      )}
    </div>
  );
}
