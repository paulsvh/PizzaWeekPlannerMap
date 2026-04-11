'use client';

import { useEffect, useState } from 'react';
import { Drawer } from 'vaul';
import type { Restaurant } from '@/lib/types';

type RestaurantSheetProps = {
  restaurant: Restaurant | null;
  onClose: () => void;
};

/**
 * The editorial "restaurant review" drawer that slides up when a pin
 * is tapped on the map. Structured like a newspaper feature column:
 * hero photo with caption rule, "THE PIZZA" kicker, title, dietary
 * chips as hot-metal typographic stamps, "What They Say" as a
 * sauce-red pull quote, and a primary action button to open in
 * Google Maps.
 */
export function RestaurantSheet({ restaurant, onClose }: RestaurantSheetProps) {
  // Keep the last restaurant around while the drawer animates out so
  // the content doesn't flash empty during the close transition.
  const [displayed, setDisplayed] = useState<Restaurant | null>(null);
  const isOpen = restaurant !== null;

  useEffect(() => {
    if (restaurant) {
      setDisplayed(restaurant);
    } else {
      const timeout = setTimeout(() => setDisplayed(null), 400);
      return () => clearTimeout(timeout);
    }
  }, [restaurant]);

  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      snapPoints={[0.42, 0.92]}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-ink/45 backdrop-blur-[2px]" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed right-0 bottom-0 left-0 z-50 flex max-h-[94vh] flex-col border-t-[3px] border-ink bg-cream shadow-[0_-24px_48px_rgba(22,20,19,0.4)] outline-none"
        >
          {/* Drag handle — a heavy ink bar you can grab */}
          <div
            aria-hidden
            className="flex shrink-0 justify-center pt-2.5 pb-1.5"
          >
            <div className="h-1 w-14 rounded-full bg-ink" />
          </div>

          {displayed ? (
            <SheetContent key={displayed.id} restaurant={displayed} />
          ) : (
            <>
              {/* Empty placeholder so Drawer.Title/Description exist for a11y */}
              <Drawer.Title className="sr-only">Restaurant details</Drawer.Title>
              <Drawer.Description className="sr-only">
                Tap a pin on the map to see restaurant details.
              </Drawer.Description>
            </>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

/* -------------------------------------------------------------------------
   Sheet body — the actual editorial content
   ------------------------------------------------------------------------- */

function SheetContent({ restaurant }: { restaurant: Restaurant }) {
  const gmapsQuery = encodeURIComponent(
    `${restaurant.name}, ${restaurant.address}`,
  );
  const gmapsLink = restaurant.googlePlaceId
    ? `https://www.google.com/maps/search/?api=1&query=${gmapsQuery}&query_place_id=${restaurant.googlePlaceId}`
    : `https://www.google.com/maps/search/?api=1&query=${gmapsQuery}`;

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col overflow-y-auto">
      {/* =========== Article metadata strip (top dateline) =========== */}
      <div className="flex items-center justify-between border-y border-ink/30 bg-cream-deep/50 px-5 py-1.5">
        <span
          className="font-mono animate-rise text-[9px] font-bold tracking-[0.22em] text-ink-soft uppercase"
          style={{ animationDelay: '50ms' }}
        >
          &#x2726; Pizza Week 2026
        </span>
        <span
          className="font-mono animate-rise text-[9px] tracking-[0.22em] text-ink-soft uppercase"
          style={{ animationDelay: '100ms' }}
        >
          {restaurant.neighborhood ?? 'Portland'}
        </span>
      </div>

      {/* =========== Hero photograph =========== */}
      <div
        className="animate-rise relative bg-cream-deep"
        style={{ animationDelay: '140ms' }}
      >
        {restaurant.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={restaurant.imageUrl}
            alt={`${restaurant.pizzaName} at ${restaurant.name}`}
            loading="lazy"
            className="h-[200px] w-full object-cover contrast-[1.08] saturate-[0.92]"
          />
        ) : (
          <div className="font-mono flex h-[180px] w-full items-center justify-center text-[10px] tracking-[0.22em] text-ink-soft/50 uppercase">
            &mdash; No Photograph Available &mdash;
          </div>
        )}
        {/* Caption rule under the image, newsprint photo-caption style */}
        <div className="flex items-center justify-between border-t-2 border-b border-ink bg-cream px-5 py-1.5">
          <span className="font-mono text-[8px] tracking-[0.22em] text-ink-soft uppercase">
            &#9662; Photograph
          </span>
          <span className="font-mono max-w-[65%] truncate text-[8px] tracking-[0.22em] text-ink-soft uppercase">
            {restaurant.name}
          </span>
        </div>
      </div>

      {/* =========== Main article body =========== */}
      <div className="flex flex-col gap-5 px-5 py-5">
        {/* Title block — kicker + big name */}
        <section
          className="animate-rise flex flex-col gap-1.5"
          style={{ animationDelay: '220ms' }}
        >
          <span className="font-mono text-[9px] font-bold tracking-[0.28em] text-sauce uppercase">
            &#x2500;&#x2500;&#x2500; The Pizza &#x2500;&#x2500;&#x2500;
          </span>
          <Drawer.Title className="font-display text-[clamp(1.9rem,7.5vw,2.75rem)] leading-[0.92] font-black tracking-[-0.02em] text-ink">
            {restaurant.pizzaName}
          </Drawer.Title>
        </section>

        {/* Thin rule */}
        <div
          className="animate-slash h-[2px] bg-ink"
          style={{ animationDelay: '300ms' }}
        />

        {/* Restaurant name + neighborhood */}
        <section
          className="animate-rise"
          style={{ animationDelay: '340ms' }}
        >
          <Drawer.Description className="font-display text-lg leading-tight font-bold text-ink sm:text-xl">
            {restaurant.name}
          </Drawer.Description>
          {restaurant.neighborhood && (
            <p className="font-mono mt-1 text-[10px] tracking-[0.2em] text-ink-soft uppercase">
              &#8212; {restaurant.neighborhood}
            </p>
          )}
        </section>

        {/* Chips row — dietary + format tags as hot-metal stamps */}
        <section
          className="animate-rise flex flex-wrap gap-2"
          style={{ animationDelay: '420ms' }}
          aria-label="Pizza options and dietary tags"
        >
          {restaurant.servesMeat && <Chip variant="meat">Meat</Chip>}
          {restaurant.servesVegetarian && <Chip variant="veg">Veg Option</Chip>}
          {restaurant.servesVegan && <Chip variant="vegan">Vegan Option</Chip>}
          {restaurant.hasGlutenFreeOption && <Chip variant="gf">GF Option</Chip>}
          {restaurant.servesSlice && <Chip variant="outline">$4 Slice</Chip>}
          {restaurant.servesWholePie && <Chip variant="outline">$25 Whole Pie</Chip>}
        </section>

        {/* "What's On It" section */}
        <section
          className="animate-rise flex flex-col gap-3"
          style={{ animationDelay: '500ms' }}
        >
          <div className="flex items-center gap-3">
            <span aria-hidden className="h-[2px] w-8 bg-ink" />
            <h3 className="font-mono text-[10px] font-bold tracking-[0.25em] text-ink uppercase">
              What&apos;s On It
            </h3>
            <span aria-hidden className="h-[2px] flex-1 bg-ink" />
          </div>
          <p className="font-display text-base leading-relaxed text-ink-soft sm:text-[17px]">
            {restaurant.pizzaIngredients}
          </p>
        </section>

        {/* "What They Say" — pull quote */}
        {restaurant.pizzaBackstory && (
          <section
            className="animate-rise relative border-l-[3px] border-sauce pt-1 pb-2 pl-5"
            style={{ animationDelay: '580ms' }}
          >
            <span
              aria-hidden
              className="font-display pointer-events-none absolute -top-6 -left-1 text-[6rem] leading-none font-black text-sauce/25 select-none"
            >
              &ldquo;
            </span>
            <div className="relative">
              <h3 className="font-mono mb-2 text-[9px] font-bold tracking-[0.25em] text-sauce uppercase">
                What They Say
              </h3>
              <p className="font-display text-[15px] leading-relaxed text-ink italic sm:text-base">
                {restaurant.pizzaBackstory}
              </p>
              <p className="font-mono mt-3 text-[9px] tracking-[0.18em] text-ink-soft uppercase">
                &mdash; {restaurant.name}
              </p>
            </div>
          </section>
        )}

        {/* Address line */}
        <section
          className="animate-rise"
          style={{ animationDelay: '660ms' }}
        >
          <a
            href={gmapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono group flex items-start gap-2 border-t border-ink/30 pt-3 text-[11px] tracking-[0.08em] text-ink-soft uppercase transition-colors hover:text-ink sm:text-xs"
          >
            <span className="mt-0.5 text-sauce" aria-hidden>
              &rarr;
            </span>
            <span className="flex-1">{restaurant.address}</span>
            <span
              aria-hidden
              className="shrink-0 text-ink-faded opacity-60 transition-opacity group-hover:opacity-100"
            >
              &#8599;
            </span>
          </a>
        </section>

        {/* Main action button — mirrors the login page's Check In button */}
        <a
          href={gmapsLink}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono group animate-rise flex items-center justify-between border-2 border-ink bg-ink px-5 py-4 text-sm font-bold tracking-[0.18em] text-cream uppercase transition-colors hover:border-sauce hover:bg-sauce focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sauce sm:text-base"
          style={{ animationDelay: '740ms' }}
        >
          <span>Open in Google Maps</span>
          <span
            aria-hidden
            className="transition-transform group-hover:translate-x-1"
          >
            &rarr;
          </span>
        </a>

        {/* Footer — source attribution */}
        <footer
          className="animate-rise flex items-center justify-between gap-3 border-t border-ink/30 pt-3 pb-4"
          style={{ animationDelay: '820ms' }}
        >
          <a
            href={restaurant.everoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[9px] tracking-[0.22em] text-ink-soft/70 uppercase transition-colors hover:text-ink"
          >
            Source: EverOut Portland
          </a>
          <span className="font-mono text-[9px] tracking-[0.22em] text-ink-soft/60 uppercase">
            &sect; 2026
          </span>
        </footer>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Chip — typographic hot-metal-stamp tags
   ------------------------------------------------------------------------- */

type ChipVariant = 'meat' | 'veg' | 'vegan' | 'gf' | 'outline';

function Chip({
  variant,
  children,
}: {
  variant: ChipVariant;
  children: React.ReactNode;
}) {
  const base =
    'inline-flex items-center font-mono text-[10px] sm:text-[10.5px] font-bold tracking-[0.18em] uppercase px-2.5 py-1 border whitespace-nowrap';

  const variants: Record<ChipVariant, string> = {
    meat: 'bg-ink text-cream border-ink',
    veg: 'bg-mustard text-ink border-ink',
    vegan: 'bg-basil text-cream border-basil',
    gf: 'bg-cream-deep text-ink border-ink',
    outline: 'bg-cream text-ink border-ink border-dashed',
  };

  return <span className={`${base} ${variants[variant]}`}>{children}</span>;
}
