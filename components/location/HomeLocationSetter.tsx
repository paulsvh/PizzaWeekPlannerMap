'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import type { UserLocation } from '@/lib/types';

type HomeLocationSetterProps = {
  initialLocation: UserLocation | null;
};

type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'error'; message: string };

/**
 * HomeLocationSetter — the "classifieds desk" where users file their
 * home address with the pressroom. Compact editorial widget that
 * toggles between an address input (Google Places Autocomplete) and
 * a saved-address display with Change/Clear controls.
 *
 * Must be rendered inside an <APIProvider> so useMapsLibrary works.
 */
export function HomeLocationSetter({
  initialLocation,
}: HomeLocationSetterProps) {
  const [location, setLocation] = useState<UserLocation | null>(
    initialLocation,
  );
  const [editing, setEditing] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>({ kind: 'idle' });

  const showInput = !location || editing;

  const handlePlaceSelected = useCallback(
    async (place: {
      lat: number;
      lng: number;
      formattedAddress: string;
      placeId: string | null;
    }) => {
      setSaveState({ kind: 'saving' });
      try {
        const res = await fetch('/api/user-location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: 'Home',
            lat: place.lat,
            lng: place.lng,
            formattedAddress: place.formattedAddress,
            placeId: place.placeId,
          }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as { location: UserLocation };
        setLocation(data.location);
        setEditing(false);
        setSaveState({ kind: 'idle' });
      } catch (err) {
        setSaveState({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Save failed.',
        });
      }
    },
    [],
  );

  const handleClear = useCallback(async () => {
    setSaveState({ kind: 'saving' });
    try {
      const res = await fetch('/api/user-location', { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setLocation(null);
      setEditing(false);
      setSaveState({ kind: 'idle' });
    } catch (err) {
      setSaveState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Clear failed.',
      });
    }
  }, []);

  return (
    <div className="flex flex-col gap-2">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <span aria-hidden className="text-mustard">
          &#x2302;
        </span>
        <span className="font-mono text-[9px] font-bold tracking-[0.22em] text-ink-soft uppercase">
          Home Base
        </span>
        <span aria-hidden className="h-[1px] flex-1 bg-ink/20" />
      </div>

      {showInput ? (
        <PlacesInput
          onSelect={handlePlaceSelected}
          isSaving={saveState.kind === 'saving'}
          onCancel={
            location && editing ? () => setEditing(false) : undefined
          }
        />
      ) : (
        <div className="flex items-center gap-2 border border-dashed border-ink/40 bg-cream-deep/30 px-3 py-2">
          <span aria-hidden className="text-mustard text-sm">
            &#x2302;
          </span>
          <span className="font-mono min-w-0 flex-1 truncate text-[10px] tracking-[0.1em] text-ink-soft">
            {location!.formattedAddress}
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="font-mono shrink-0 text-[9px] font-bold tracking-[0.18em] text-ink-soft uppercase transition-colors hover:text-sauce"
          >
            Change
          </button>
          <span aria-hidden className="text-ink-faded/40">
            |
          </span>
          <button
            type="button"
            onClick={handleClear}
            disabled={saveState.kind === 'saving'}
            className="font-mono shrink-0 text-[9px] font-bold tracking-[0.18em] text-ink-faded uppercase transition-colors hover:text-sauce disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      )}

      {saveState.kind === 'error' && (
        <p className="font-mono text-[9px] tracking-[0.15em] text-sauce uppercase">
          &rarr; {saveState.message}
        </p>
      )}
    </div>
  );
}

/* =========================================================================
   PlacesInput — Google Places Autocomplete wired imperatively
   ========================================================================= */

function PlacesInput({
  onSelect,
  isSaving,
  onCancel,
}: {
  onSelect: (place: {
    lat: number;
    lng: number;
    formattedAddress: string;
    placeId: string | null;
  }) => void;
  isSaving: boolean;
  onCancel?: () => void;
}) {
  const placesLib = useMapsLibrary('places');
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!placesLib || !inputRef.current) return;
    if (autocompleteRef.current) return; // already wired

    const ac = new placesLib.Autocomplete(inputRef.current, {
      fields: ['geometry', 'formatted_address', 'place_id'],
      componentRestrictions: { country: 'us' },
    });

    // Bias toward Portland metro
    ac.setBounds({
      north: 45.65,
      south: 45.40,
      east: -122.45,
      west: -122.85,
    });

    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (!place.geometry?.location) return;
      onSelect({
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        formattedAddress: place.formatted_address ?? '',
        placeId: place.place_id ?? null,
      });
    });

    autocompleteRef.current = ac;

    // Focus the input on mount for immediate typing
    inputRef.current.focus();

    return () => {
      google.maps.event.clearInstanceListeners(ac);
      autocompleteRef.current = null;
    };
  }, [placesLib, onSelect]);

  return (
    <div className="flex items-stretch gap-2">
      <div className="relative min-w-0 flex-1">
        <input
          ref={inputRef}
          type="text"
          placeholder="Enter your address\u2026"
          disabled={isSaving}
          className="font-mono w-full border border-ink bg-cream px-3 py-2 text-[11px] tracking-[0.08em] text-ink placeholder:text-ink-faded/50 focus:border-sauce focus:outline-none disabled:opacity-50"
        />
        {isSaving && (
          <span className="font-mono absolute right-2 top-1/2 -translate-y-1/2 text-[9px] tracking-[0.18em] text-sauce uppercase">
            Saving&hellip;
          </span>
        )}
      </div>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="font-mono shrink-0 border border-ink bg-cream px-3 py-2 text-[9px] font-bold tracking-[0.18em] text-ink uppercase transition-colors hover:bg-ink hover:text-cream"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
