'use client';

import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { APIProvider } from '@vis.gl/react-google-maps';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Restaurant } from '@/lib/types';
import { usePlotRoute } from '@/lib/maps/use-plot-route';
import { MAX_WAYPOINTS } from '@/lib/maps/constants';
import { RouteEditorMap } from '@/components/route-editor/RouteEditorMap';

type RouteEditorProps = {
  routeId: string;
  creatorDisplayName: string;
  /** The route's persisted stops, in saved order. Used as the
   * initial editor state and as the "Revert" baseline. */
  savedStops: Restaurant[];
  /** Every restaurant in the app — used to populate the
   * "Also Available" picker for adding stops to the draft. */
  allRestaurants: Restaurant[];
  mapsApiKey: string;
  /** Fallback stats shown before the first `usePlotRoute`
   * recompute completes on mount. */
  savedDistanceMeters: number;
  savedDurationSeconds: number;
};

const MIN_STOPS = 2;
const MAX_STOPS = MAX_WAYPOINTS + 1;

/** Shallow ID-only equality for stop lists. */
function stopsEqualById(a: Restaurant[], b: Restaurant[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id) return false;
  }
  return true;
}

/**
 * Full-page route editor — a broadsheet "Revise Dispatch" experience
 * mirroring the read-only detail page's layout but with every piece
 * of the route made editable.
 *
 * Contract:
 *   - savedStops / savedDistance* are the server's truth at page load
 *   - editStops is the in-flight draft; everything visible derives
 *     from it (stats, map, list, Reset enablement, Save enablement)
 *   - Save PATCHes `/api/routes/[routeId]` with the live Directions
 *     result and navigates back to the detail page on success
 *
 * APIProvider wraps RouteEditorInner so usePlotRoute (inside Inner)
 * can find the Maps library context. This matches the MapView
 * pattern on the home page.
 */
export function RouteEditor(props: RouteEditorProps) {
  if (!props.mapsApiKey) {
    return <MissingKeyNotice routeId={props.routeId} />;
  }
  return (
    <APIProvider apiKey={props.mapsApiKey}>
      <RouteEditorInner {...props} />
    </APIProvider>
  );
}

type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'error'; message: string };

function RouteEditorInner({
  routeId,
  creatorDisplayName,
  savedStops,
  allRestaurants,
  savedDistanceMeters,
  savedDurationSeconds,
}: RouteEditorProps) {
  const router = useRouter();

  // The draft. Seeded from the server snapshot; every edit mutates
  // it locally and the Directions hook recomputes in the background.
  const [editStops, setEditStops] = useState<Restaurant[]>(savedStops);
  const [saveState, setSaveState] = useState<SaveState>({ kind: 'idle' });

  // Optimize flow: when the user clicks "Optimize Route", we flip
  // `optimizing` to true so usePlotRoute calls Google with
  // `optimizeWaypoints: true`. Once Google's optimal order comes
  // back, we apply it to editStops and flip optimizing back off.
  // The ref tracks whether the hook has entered 'computing' at
  // least once since the button was clicked — without that guard
  // the effect would immediately re-apply the stale pre-optimize
  // result on the first render.
  const [optimizing, setOptimizing] = useState(false);
  const optimizeSeenComputing = useRef(false);

  const { status: plotStatus, result: plotResult, error: plotError } =
    usePlotRoute({
      enabled: true,
      waypoints: editStops,
      optimize: optimizing,
    });

  // Capture the optimize result: once the hook transitions
  // computing → ready after an optimize request, apply Google's
  // optimal stop order to the draft and flip optimize off.
  useEffect(() => {
    if (!optimizing) return;
    if (plotStatus === 'computing') {
      optimizeSeenComputing.current = true;
    }
    if (
      optimizeSeenComputing.current &&
      plotStatus === 'ready' &&
      plotResult
    ) {
      optimizeSeenComputing.current = false;
      setEditStops(plotResult.orderedStops);
      setOptimizing(false);
    }
  }, [optimizing, plotStatus, plotResult]);

  const isDirty = !stopsEqualById(editStops, savedStops);
  const isRecomputing = plotStatus === 'computing';
  const atMaxCapacity = editStops.length >= MAX_STOPS;
  const canRemoveStops = editStops.length > MIN_STOPS;

  // Prefer live numbers when we have them; fall back to the saved
  // metrics on first paint so the stats row isn't a stack of zeros
  // for the ~500ms it takes the debounced hook to settle.
  const displayMeters =
    plotResult?.totalDistanceMeters ?? savedDistanceMeters;
  const displaySeconds =
    plotResult?.totalDurationSeconds ?? savedDurationSeconds;
  const miles = displayMeters / 1609.344;
  const durationText = formatDuration(displaySeconds);

  // dnd-kit sensors tuned the same way as the plot sheet: 8px
  // pointer movement to start a drag on desktop, 200ms hold + 8px
  // tolerance on touch so the user can scroll past cards on
  // mobile without lifting them.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const stopIds = useMemo(() => editStops.map((s) => s.id), [editStops]);

  // Whether `plotResult.legDistancesMeters` still indexes to the
  // current draft. When the user drags, editStops updates instantly
  // but the hook is in flight for ~500ms; showing stale leg numbers
  // in that window would be confusing, so placeholders fill in.
  const legsInSync = useMemo(() => {
    if (!plotResult) return false;
    if (editStops.length !== plotResult.orderedStops.length) return false;
    for (let i = 0; i < editStops.length; i++) {
      if (editStops[i].id !== plotResult.orderedStops[i].id) return false;
    }
    return true;
  }, [editStops, plotResult]);

  const availableToAdd = useMemo(() => {
    const inDraft = new Set(editStops.map((s) => s.id));
    return allRestaurants.filter((r) => !inDraft.has(r.id));
  }, [editStops, allRestaurants]);

  /* ---------- mutations ---------- */

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = editStops.findIndex((s) => s.id === active.id);
    const newIndex = editStops.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setEditStops(arrayMove(editStops, oldIndex, newIndex));
  };

  const handleRemove = (restaurantId: string) => {
    setEditStops((prev) => {
      if (prev.length <= MIN_STOPS) return prev;
      const next = prev.filter((s) => s.id !== restaurantId);
      return next.length === prev.length ? prev : next;
    });
  };

  const handleAdd = (restaurantId: string) => {
    setEditStops((prev) => {
      if (prev.length >= MAX_STOPS) return prev;
      if (prev.some((s) => s.id === restaurantId)) return prev;
      const toAdd = allRestaurants.find((r) => r.id === restaurantId);
      if (!toAdd) return prev;
      return [...prev, toAdd];
    });
  };

  const handleOptimize = () => {
    if (editStops.length < 2 || isRecomputing || optimizing) return;
    optimizeSeenComputing.current = false;
    setOptimizing(true);
  };

  /* ---------- save ---------- */

  const canSave =
    plotResult !== null &&
    !isRecomputing &&
    saveState.kind !== 'saving';

  const handleSave = async () => {
    if (!canSave || !plotResult) return;
    setSaveState({ kind: 'saving' });
    try {
      const res = await fetch(`/api/routes/${routeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stopRestaurantIds: plotResult.orderedStops.map((s) => s.id),
          originLat: plotResult.origin.lat,
          originLng: plotResult.origin.lng,
          encodedPolyline: plotResult.encodedPolyline,
          totalDistanceMeters: plotResult.totalDistanceMeters,
          totalDurationSeconds: plotResult.totalDurationSeconds,
          legDistancesMeters: plotResult.legDistancesMeters,
          legDurationsSeconds: plotResult.legDurationsSeconds,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      // Full-page navigation to the detail page; router.push +
      // router.refresh() is redundant here because the destination
      // is a different route that'll re-fetch on its own.
      router.push(`/routes/${routeId}`);
    } catch (err) {
      setSaveState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Save failed.',
      });
    }
  };

  /* ---------- render ---------- */

  return (
    <main className="relative min-h-dvh">
      {/* ============================================================
          Sticky top nav — Cancel (back) on the left, Save on the
          right. The Save button mirrors the one in the body so the
          user can commit without scrolling.
          ============================================================ */}
      <nav
        className="sticky top-0 z-40 border-b-2 border-ink bg-cream/95 backdrop-blur-sm"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-3 sm:px-6">
          <Link
            href={`/routes/${routeId}`}
            className="group font-mono flex items-center gap-2 text-[10px] font-bold tracking-[0.18em] text-ink-soft uppercase transition-colors hover:text-sauce sm:text-[11px]"
          >
            <span
              aria-hidden
              className="transition-transform group-hover:-translate-x-0.5"
            >
              &larr;
            </span>
            <span>Cancel</span>
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            aria-disabled={!canSave}
            className="group font-mono flex items-center gap-2 border-[2px] border-ink bg-ink px-3 py-1.5 text-[10px] font-bold tracking-[0.18em] text-cream uppercase transition-colors hover:border-sauce hover:bg-sauce focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sauce disabled:cursor-not-allowed disabled:border-ink-faded/60 disabled:bg-ink-faded/50 sm:px-4 sm:py-2 sm:text-[11px]"
          >
            <span>
              {saveState.kind === 'saving'
                ? 'Saving\u2026'
                : isRecomputing
                  ? 'Recomputing\u2026'
                  : 'Save'}
            </span>
            <span
              aria-hidden
              className="transition-transform group-hover:translate-x-0.5 group-disabled:translate-x-0"
            >
              &rarr;
            </span>
          </button>
        </div>
      </nav>

      <article className="relative mx-auto max-w-3xl px-5 pt-10 pb-16 sm:pt-14">
        {/* ============================================================
            Hero masthead
            ============================================================ */}
        <header className="flex flex-col gap-3">
          <div
            className="font-mono animate-rise flex items-center justify-between gap-2 text-[10px] tracking-[0.22em] text-ink-soft uppercase sm:text-[11px]"
            style={{ animationDelay: '100ms' }}
          >
            <span>Route Dispatch &middot; Editing</span>
            <span
              className={`hidden sm:inline ${
                isDirty ? 'text-sauce' : 'text-ink-faded'
              }`}
            >
              {isDirty ? 'Unsaved Changes' : 'Pristine Draft'}
            </span>
          </div>

          <div
            className="animate-slash h-[3px] bg-ink"
            style={{ animationDelay: '180ms' }}
          />

          <h1
            className="font-display animate-rise leading-[0.85] tracking-[-0.03em] text-ink"
            style={{ animationDelay: '280ms' }}
          >
            <span className="block text-[clamp(3rem,13vw,5.5rem)] font-black">
              Revise
            </span>
            <span className="-mt-[0.08em] block text-[clamp(3rem,13vw,5.5rem)] font-black break-words text-sauce italic">
              The Crawl
            </span>
          </h1>

          <div
            className="animate-slash h-[3px] bg-ink"
            style={{ animationDelay: '380ms' }}
          />

          <div
            className="font-mono animate-rise flex flex-wrap items-center justify-between gap-2 text-[10px] tracking-[0.2em] text-ink-soft uppercase sm:text-[11px]"
            style={{ animationDelay: '460ms' }}
          >
            <span>
              {editStops.length} stops &middot; biking &middot; start to finish
            </span>
            <span className="text-ink-faded">
              Filed by {creatorDisplayName}
            </span>
          </div>
        </header>

        {/* ============================================================
            Stats — live-updating as the user edits
            ============================================================ */}
        <section
          className={`animate-rise mt-8 grid grid-cols-3 gap-2 border-y-2 border-ink py-5 transition-opacity duration-150 ${
            isRecomputing ? 'opacity-55' : 'opacity-100'
          }`}
          style={{ animationDelay: '580ms' }}
          aria-label="Route statistics"
          aria-busy={isRecomputing}
        >
          <Stat value={miles.toFixed(1)} label="Miles" />
          <Stat
            value={durationText.value}
            label={durationText.label}
            divider
          />
          <Stat value={String(editStops.length)} label="Stops" divider />
        </section>

        {/* ============================================================
            Embedded map — live polyline from usePlotRoute
            ============================================================ */}
        <figure
          className="animate-rise mt-8 flex flex-col"
          style={{ animationDelay: '720ms' }}
        >
          <div
            role="img"
            aria-label="Map of the draft route"
            className="relative h-[50vh] max-h-[540px] min-h-[320px] w-full border-[3px] border-ink bg-cream-deep shadow-[6px_6px_0_rgba(22,20,19,0.12)]"
          >
            <RouteEditorMap
              stops={editStops}
              path={plotResult?.path ?? []}
            />
          </div>
          <figcaption className="flex items-center justify-between border-x-[3px] border-b-[3px] border-ink bg-cream px-4 py-1.5">
            <span className="font-mono text-[9px] tracking-[0.22em] text-ink-soft uppercase">
              &#9662; Draft Route
            </span>
            <span
              className={`font-mono text-[9px] tracking-[0.22em] uppercase transition-colors ${
                isRecomputing ? 'text-sauce' : 'text-ink-soft'
              }`}
            >
              {isRecomputing ? 'Recomputing\u2026' : 'Live via Google Bicycling'}
            </span>
          </figcaption>
        </figure>

        {/* ============================================================
            In Order — drag to reorder + ✕ to remove
            ============================================================ */}
        <section
          className="animate-rise mt-10 flex flex-col gap-4"
          style={{ animationDelay: '860ms' }}
        >
          <div className="flex items-center gap-3">
            <span aria-hidden className="h-[2px] w-6 bg-ink sm:w-8" />
            <h2 className="font-mono text-[11px] font-bold tracking-[0.25em] text-ink uppercase sm:text-[12px]">
              In Order
            </h2>
            <span aria-hidden className="h-[2px] flex-1 bg-ink" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleOptimize}
              disabled={editStops.length < 2 || isRecomputing || optimizing}
              aria-disabled={editStops.length < 2 || isRecomputing || optimizing}
              className="font-mono flex items-center gap-1.5 border-[1.5px] border-ink bg-cream px-2.5 py-1.5 text-[9px] font-bold tracking-[0.18em] text-ink uppercase transition-colors hover:border-mustard hover:bg-mustard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sauce disabled:cursor-not-allowed disabled:border-ink-faded/50 disabled:text-ink-faded/60 sm:text-[10px]"
              aria-label="Let Google reorder stops for the shortest biking route"
            >
              <span aria-hidden>{optimizing ? '\u22EF' : '\u2728'}</span>
              <span>{optimizing ? 'Optimizing\u2026' : 'Optimize Route'}</span>
            </button>
            <Link
              href={`/routes/${routeId}`}
              className="font-mono flex items-center gap-1.5 border-[1.5px] border-ink bg-cream px-2.5 py-1.5 text-[9px] font-bold tracking-[0.18em] text-ink uppercase transition-colors hover:border-ink hover:bg-ink hover:text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sauce sm:text-[10px]"
            >
              <span aria-hidden>&larr;</span>
              <span>Cancel Edit</span>
            </Link>
          </div>

          <p className="font-mono text-[9px] tracking-[0.2em] text-ink-soft/70 uppercase italic">
            Press and drag to rearrange. Tap &times; to remove a stop.
          </p>

          {plotError && (
            <div
              role="alert"
              className="flex items-start gap-3 border-l-[3px] border-sauce bg-sauce/5 py-1 pl-3"
            >
              <span className="font-mono text-[10px] font-bold tracking-[0.25em] text-sauce uppercase">
                Stop&mdash;
              </span>
              <p className="font-display text-sm text-ink">{plotError}</p>
            </div>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={stopIds}
              strategy={verticalListSortingStrategy}
            >
              <ol className="flex flex-col gap-1">
                {editStops.map((stop, i) => {
                  const showLegBefore = i > 0;
                  const legMeters = plotResult?.legDistancesMeters[i - 1];
                  const legSeconds = plotResult?.legDurationsSeconds[i - 1];
                  return (
                    <Fragment key={stop.id}>
                      {showLegBefore &&
                        (legsInSync &&
                        typeof legMeters === 'number' &&
                        typeof legSeconds === 'number' ? (
                          <LegDivider
                            meters={legMeters}
                            seconds={legSeconds}
                          />
                        ) : (
                          <LegDividerPlaceholder />
                        ))}
                      <SortableStopCard
                        stop={stop}
                        index={i}
                        totalStops={editStops.length}
                        canRemove={canRemoveStops}
                        onRemove={handleRemove}
                      />
                    </Fragment>
                  );
                })}
                {/* No return leg — route ends at the last stop. */}
              </ol>
            </SortableContext>
          </DndContext>
        </section>

        {/* ============================================================
            Also Available — classifieds picker for adding stops
            ============================================================ */}
        <section
          className="animate-rise mt-10 flex flex-col gap-3"
          style={{ animationDelay: '1000ms' }}
          aria-label="Available restaurants to add"
        >
          <div className="flex items-center gap-3">
            <span aria-hidden className="h-[2px] w-6 bg-ink sm:w-8" />
            <h2 className="font-mono text-[11px] font-bold tracking-[0.25em] text-ink uppercase sm:text-[12px]">
              Also Available
            </h2>
            <span aria-hidden className="h-[2px] flex-1 bg-ink" />
            <span className="font-mono text-[9px] tracking-[0.18em] text-ink-soft uppercase">
              {atMaxCapacity
                ? `Max ${MAX_STOPS}`
                : `${availableToAdd.length} left`}
            </span>
          </div>

          <p className="font-mono text-[9px] tracking-[0.2em] text-ink-soft/70 uppercase italic">
            {atMaxCapacity
              ? 'Route is full. Remove a stop to add another.'
              : 'Tap a listing to append it to the route.'}
          </p>

          {availableToAdd.length === 0 ? (
            <div className="font-mono border border-dashed border-ink-faded/50 bg-cream-deep/30 px-4 py-3 text-[10px] tracking-[0.18em] text-ink-faded uppercase italic">
              &mdash; Every restaurant is on this route &mdash;
            </div>
          ) : (
            <ul className="flex flex-col gap-1">
              {availableToAdd.map((r) => (
                <AvailableStopRow
                  key={r.id}
                  stop={r}
                  disabled={atMaxCapacity}
                  onAdd={handleAdd}
                />
              ))}
            </ul>
          )}
        </section>

        {/* ============================================================
            Big save + cancel at the bottom
            ============================================================ */}
        <section
          className="animate-rise mt-10 flex flex-col gap-3"
          style={{ animationDelay: '1100ms' }}
        >
          {saveState.kind === 'error' && (
            <div
              role="alert"
              className="flex items-start gap-3 border-l-[3px] border-sauce bg-sauce/5 py-1 pl-3"
            >
              <span className="font-mono text-[10px] font-bold tracking-[0.25em] text-sauce uppercase">
                Stop&mdash;
              </span>
              <p className="font-display text-sm text-ink">
                {saveState.message}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            aria-disabled={!canSave}
            className="group font-mono flex items-center justify-between border-2 border-ink bg-ink px-5 py-4 text-sm font-bold tracking-[0.18em] text-cream uppercase transition-colors hover:border-sauce hover:bg-sauce focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sauce disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
          >
            <span>
              {saveState.kind === 'saving'
                ? 'Saving\u2026'
                : isRecomputing
                  ? 'Recomputing\u2026'
                  : 'Save Changes'}
            </span>
            <span
              aria-hidden
              className="transition-transform group-hover:translate-x-1 group-disabled:translate-x-0"
            >
              {saveState.kind === 'saving' || isRecomputing
                ? '\u22EF'
                : '\u2192'}
            </span>
          </button>

          <Link
            href={`/routes/${routeId}`}
            className="group font-mono flex items-center justify-between border-2 border-ink bg-cream px-5 py-4 text-sm font-bold tracking-[0.18em] text-ink uppercase transition-colors hover:border-ink hover:bg-ink hover:text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sauce sm:text-base"
          >
            <span
              aria-hidden
              className="transition-transform group-hover:-translate-x-1"
            >
              &larr;
            </span>
            <span>Cancel Edit</span>
            <span aria-hidden className="w-4" />
          </Link>
        </section>

        {/* ============================================================
            Footer colophon
            ============================================================ */}
        <footer
          className="animate-rise mt-12 flex flex-col gap-2 border-t border-ink/30 pt-4"
          style={{ animationDelay: '1200ms' }}
        >
          <div className="font-mono flex items-center justify-between gap-3 text-[9px] tracking-[0.22em] text-ink-soft uppercase sm:text-[10px]">
            <span>Printed in PDX</span>
            <span>&sect;</span>
            <span>Draft Dispatch</span>
          </div>
          <p className="font-mono text-center text-[8px] tracking-[0.2em] text-ink-faded uppercase">
            Biking directions via Google Directions API
          </p>
        </footer>
      </article>
    </main>
  );
}

/* =========================================================================
   Stat — one cell of the stats row, identical shape to the detail page
   ========================================================================= */

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
      <span className="font-display text-[clamp(1.75rem,7vw,2.75rem)] leading-none font-black tracking-[-0.02em] text-ink">
        {value}
      </span>
      <span className="font-mono text-[9px] font-bold tracking-[0.22em] text-ink-soft uppercase">
        {label}
      </span>
    </div>
  );
}

/* =========================================================================
   SortableStopCard — drag to reorder, ✕ to remove
   ========================================================================= */

type SortableStopCardProps = {
  stop: Restaurant;
  index: number;
  totalStops: number;
  canRemove: boolean;
  onRemove: (restaurantId: string) => void;
};

function SortableStopCard({
  stop,
  index,
  totalStops,
  canRemove,
  onRemove,
}: SortableStopCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 20 : undefined,
  };

  const isFirst = index === 0;

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group flex touch-none cursor-grab items-stretch gap-3 border-[1.5px] border-ink bg-cream px-3 py-3 select-none active:cursor-grabbing sm:px-4 ${
        isFirst ? 'border-l-[5px] border-l-sauce' : ''
      } ${isDragging ? 'shadow-[0_8px_24px_rgba(22,20,19,0.25)]' : 'shadow-[3px_3px_0_rgba(22,20,19,0.08)]'}`}
      aria-label={`${stop.pizzaName} at ${stop.name}, position ${index + 1} of ${totalStops}. Press and drag to reorder.`}
    >
      <span
        aria-hidden
        className="font-mono flex shrink-0 items-start bg-ink px-2 py-1 text-[11px] font-bold tracking-[0.1em] text-cream"
      >
        {String(index + 1).padStart(2, '0')}
      </span>
      <div className="min-w-0 flex-1 self-center">
        {isFirst && (
          <p className="font-mono mb-0.5 flex items-center gap-1 text-[8px] font-bold tracking-[0.22em] text-sauce uppercase">
            <span aria-hidden>&#x2605;</span>
            <span>Start</span>
          </p>
        )}
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
      {/* Remove button — stopPropagation on pointerdown prevents
          dnd-kit from eating the tap as a drag-start. */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!canRemove) return;
          onRemove(stop.id);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        disabled={!canRemove}
        aria-disabled={!canRemove}
        aria-label={
          canRemove
            ? `Remove ${stop.pizzaName} from the route`
            : 'At minimum of two stops; add more before removing'
        }
        className="font-mono flex shrink-0 cursor-pointer items-center justify-center self-center border-[1.5px] border-ink bg-cream px-2.5 py-1 text-[14px] leading-none font-bold text-ink transition-colors hover:border-sauce hover:bg-sauce hover:text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sauce disabled:cursor-not-allowed disabled:border-ink-faded/50 disabled:bg-cream-deep/50 disabled:text-ink-faded/60 disabled:hover:border-ink-faded/50 disabled:hover:bg-cream-deep/50 disabled:hover:text-ink-faded/60"
      >
        &times;
      </button>
    </li>
  );
}

/* =========================================================================
   Leg dividers — the between-card mono captions showing distance +
   duration for each leg. Identical look/feel to the plot sheet's.
   ========================================================================= */

function LegDivider({
  meters,
  seconds,
}: {
  meters: number;
  seconds: number;
}) {
  return (
    <li
      aria-hidden
      className="flex items-center gap-2 px-1 py-1.5"
    >
      <span className="h-[1px] flex-1 bg-ink/30" />
      <span className="font-mono flex items-center gap-1.5 text-[9px] tracking-[0.18em] text-ink-soft uppercase">
        <span aria-hidden className="text-sauce">
          &darr;
        </span>
        <span className="font-bold text-ink">
          {formatMilesShort(meters)} mi
        </span>
        <span aria-hidden className="text-ink-faded/60">
          &middot;
        </span>
        <span>{formatMinutesShort(seconds)}</span>
      </span>
      <span className="h-[1px] flex-1 bg-ink/30" />
    </li>
  );
}

function LegDividerPlaceholder() {
  return (
    <li
      aria-hidden
      className="flex items-center gap-2 px-1 py-1.5"
    >
      <span className="h-[1px] flex-1 bg-ink/15" />
      <span className="font-mono text-[9px] tracking-[0.2em] text-ink-faded/60 uppercase italic">
        Recomputing&hellip;
      </span>
      <span className="h-[1px] flex-1 bg-ink/15" />
    </li>
  );
}

/* =========================================================================
   AvailableStopRow — classifieds row for a restaurant not yet on the
   route. Dashed border + cream-deep fill so it reads as subordinate to
   the solid numbered cards above. Tap the [+] to append.
   ========================================================================= */

type AvailableStopRowProps = {
  stop: Restaurant;
  disabled: boolean;
  onAdd: (restaurantId: string) => void;
};

function AvailableStopRow({
  stop,
  disabled,
  onAdd,
}: AvailableStopRowProps) {
  return (
    <li className="flex items-stretch gap-3 border-[1.5px] border-dashed border-ink/35 bg-cream-deep/30 px-3 py-2 transition-colors hover:border-ink/60 hover:bg-cream-deep/55 sm:px-4">
      <div className="min-w-0 flex-1 self-center">
        <p className="font-display text-[13px] leading-tight font-bold text-ink sm:text-sm">
          {stop.pizzaName}
        </p>
        <p className="font-mono mt-0.5 truncate text-[9px] tracking-[0.15em] text-ink-soft uppercase">
          {stop.name}
          {stop.neighborhood ? (
            <span className="text-ink-faded">
              {' '}
              &middot; {stop.neighborhood}
            </span>
          ) : null}
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          onAdd(stop.id);
        }}
        disabled={disabled}
        aria-disabled={disabled}
        aria-label={
          disabled
            ? `At capacity — remove a stop before adding ${stop.pizzaName}`
            : `Add ${stop.pizzaName} to the route`
        }
        className="font-mono flex shrink-0 cursor-pointer items-center justify-center gap-1 self-center border-[1.5px] border-ink bg-cream px-2 py-1 text-[10px] font-bold tracking-[0.15em] text-ink uppercase transition-colors hover:border-basil hover:bg-basil hover:text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sauce disabled:cursor-not-allowed disabled:border-ink-faded/40 disabled:bg-cream-deep/40 disabled:text-ink-faded/60 disabled:hover:border-ink-faded/40 disabled:hover:bg-cream-deep/40 disabled:hover:text-ink-faded/60"
      >
        <span aria-hidden className="text-[12px] leading-none">
          +
        </span>
        <span>Add</span>
      </button>
    </li>
  );
}

/* =========================================================================
   MissingKeyNotice — fallback when the Maps browser key isn't set.
   Keeps the detail-page "printed notice" vocabulary so the editor
   fails loud but on brand.
   ========================================================================= */

function MissingKeyNotice({ routeId }: { routeId: string }) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 py-8">
      <div className="flex w-full max-w-[480px] flex-col gap-6">
        <div className="font-mono text-[10px] tracking-[0.25em] text-ink-soft uppercase">
          Pressroom Bulletin
        </div>
        <div className="h-[3px] bg-ink" />
        <h1 className="font-display text-[clamp(3rem,13vw,5.5rem)] leading-[0.85] font-black tracking-[-0.03em] text-ink">
          Map Key
          <span className="block text-sauce italic">Missing</span>
        </h1>
        <div className="h-[3px] bg-ink" />
        <p className="font-display text-base leading-relaxed text-ink-soft sm:text-[17px]">
          The editor needs a Google Maps browser key to compute the route.
          Set <code className="font-mono bg-cream-deep px-1.5 py-0.5 text-[12px]">NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY</code> and reload.
        </p>
        <Link
          href={`/routes/${routeId}`}
          className="group font-mono flex items-center justify-between border-2 border-ink bg-cream px-5 py-4 text-sm font-bold tracking-[0.18em] text-ink uppercase transition-colors hover:border-ink hover:bg-ink hover:text-cream"
        >
          <span
            aria-hidden
            className="transition-transform group-hover:-translate-x-1"
          >
            &larr;
          </span>
          <span>Back to Route</span>
          <span aria-hidden className="w-4" />
        </Link>
      </div>
    </main>
  );
}

/* =========================================================================
   Formatters — local copies of the helpers used across the plot sheet
   and detail page. Inline to avoid a shared util for a handful of
   three-line functions.
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
