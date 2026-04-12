'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type VoteButtonProps = {
  routeId: string;
  initialVoted: boolean;
  initialVoteCount: number;
};

/**
 * VoteButton — broadsheet stamp-style toggle, optimistic UI.
 *
 * State pattern mirrors StarsProvider: flip local state immediately,
 * POST in the background, reconcile with the server's response on
 * success, revert on error. router.refresh() at the end so any
 * Server Components on subsequent navigation see the new
 * voteCount + vote state.
 */
export function VoteButton({
  routeId,
  initialVoted,
  initialVoteCount,
}: VoteButtonProps) {
  const router = useRouter();
  const [voted, setVoted] = useState(initialVoted);
  const [voteCount, setVoteCount] = useState(initialVoteCount);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (pending) return;

    const wasVoted = voted;
    const wasCount = voteCount;

    // Optimistic
    setVoted(!wasVoted);
    setVoteCount(wasVoted ? Math.max(0, wasCount - 1) : wasCount + 1);
    setPending(true);
    setError(null);

    try {
      const res = await fetch(`/api/routes/${routeId}/vote`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as {
        voted: boolean;
        voteCount: number;
      };
      // Reconcile with the authoritative server state.
      setVoted(data.voted);
      setVoteCount(data.voteCount);
      // Refresh Server Components so the routes list / etc see the
      // new count next time the user navigates back.
      router.refresh();
    } catch (err) {
      // Revert on failure.
      setVoted(wasVoted);
      setVoteCount(wasCount);
      setError(err instanceof Error ? err.message : 'Vote failed.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={voted}
        aria-label={
          voted
            ? `Remove your vote from this route (currently ${voteCount} votes)`
            : `Vote for this route (currently ${voteCount} votes)`
        }
        className={`group font-mono flex items-center justify-between border-2 px-5 py-4 text-sm font-bold tracking-[0.18em] uppercase transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sauce disabled:cursor-wait disabled:opacity-60 sm:text-base ${
          voted
            ? 'border-sauce bg-sauce text-cream hover:bg-sauce-dark'
            : 'border-ink bg-ink text-cream hover:border-sauce hover:bg-sauce'
        }`}
        disabled={pending}
      >
        <span className="flex items-center gap-2">
          <span aria-hidden className="text-base leading-none">
            {voted ? '\u2605' : '\u2606'}
          </span>
          <span>{voted ? 'Voted' : 'Vote'}</span>
        </span>
        <span
          aria-hidden
          className="font-mono border border-cream bg-cream/15 px-2 py-0.5 text-[11px] tracking-[0.1em]"
        >
          {voteCount}
        </span>
      </button>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 border-l-[3px] border-sauce bg-sauce/5 py-1 pl-3"
        >
          <span className="font-mono text-[10px] font-bold tracking-[0.25em] text-sauce uppercase">
            Stop&mdash;
          </span>
          <p className="font-display text-sm text-ink">{error}</p>
        </div>
      )}
    </div>
  );
}
