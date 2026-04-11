'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * StarsProvider — client-side state + server sync for per-user stars.
 *
 * The initial set is fetched on the server via getStarredRestaurantIds
 * and passed in as a prop, so there's no "loading" flash after
 * navigation. Toggles are optimistic: the local state flips
 * immediately, the POST /api/stars request runs in the background,
 * and the state is reverted on error (rare).
 *
 * Because toggle is commutative (each toggle flips one bit), rapid
 * multi-clicks eventually reach the correct state regardless of
 * network ordering — no need to disable the button during pending
 * requests.
 */

type StarsContextValue = {
  starred: ReadonlySet<string>;
  isStarred: (restaurantId: string) => boolean;
  toggle: (restaurantId: string) => Promise<void>;
};

const StarsContext = createContext<StarsContextValue | null>(null);

export function useStars(): StarsContextValue {
  const ctx = useContext(StarsContext);
  if (!ctx) {
    throw new Error('useStars must be used inside a <StarsProvider>.');
  }
  return ctx;
}

type StarsProviderProps = {
  initialStarredIds: string[];
  children: ReactNode;
};

export function StarsProvider({
  initialStarredIds,
  children,
}: StarsProviderProps) {
  const [starred, setStarred] = useState<Set<string>>(
    () => new Set(initialStarredIds),
  );

  const isStarred = useCallback(
    (restaurantId: string) => starred.has(restaurantId),
    [starred],
  );

  const toggle = useCallback(
    async (restaurantId: string) => {
      const wasStarred = starred.has(restaurantId);

      // 1. Optimistic: update local state immediately.
      setStarred((prev) => {
        const next = new Set(prev);
        if (wasStarred) {
          next.delete(restaurantId);
        } else {
          next.add(restaurantId);
        }
        return next;
      });

      // 2. Background: POST to /api/stars to persist the toggle.
      try {
        const res = await fetch('/api/stars', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ restaurantId }),
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
      } catch (err) {
        // 3. Revert on failure. The next render will restore the
        //    pre-toggle state. A 401 here means the session
        //    expired — the next navigation will bounce through
        //    proxy.ts to /login.
        console.error('[stars] toggle failed, reverting:', err);
        setStarred((prev) => {
          const next = new Set(prev);
          if (wasStarred) {
            next.add(restaurantId);
          } else {
            next.delete(restaurantId);
          }
          return next;
        });
      }
    },
    [starred],
  );

  const value = useMemo<StarsContextValue>(
    () => ({ starred, isStarred, toggle }),
    [starred, isStarred, toggle],
  );

  return (
    <StarsContext.Provider value={value}>{children}</StarsContext.Provider>
  );
}
