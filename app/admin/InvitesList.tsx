'use client';

import { useState } from 'react';
import type { Invite } from '@/lib/types';
import { revokeInvite } from '@/app/admin/actions';

type InvitesListProps = {
  invites: Invite[];
  // Snapshot of Date.now() taken on the server so SSR and client
  // hydration classify every invite the same way — otherwise an
  // invite expiring between the two renders could flip its bucket
  // and cause a hydration mismatch.
  now: number;
};

type InviteStatus = 'pending' | 'claimed' | 'expired';

function formatDate(ms: number): string {
  if (!ms) return '';
  return new Date(ms).toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function classifyInvite(invite: Invite, now: number): InviteStatus {
  if (invite.claimedAt) return 'claimed';
  if (invite.expiresAt < now) return 'expired';
  return 'pending';
}

/**
 * Ledger of all invites, split into pending (visible) and past
 * (collapsed). Each invite renders as a broadsheet "receipt card"
 * with a status stamp, metadata, and action buttons for pending
 * ones.
 *
 * The Copy Link button is intentionally disabled with an inline
 * explanation: plaintext invite tokens only exist at creation time
 * (they're hashed before persistence), so there's no way to
 * re-surface a link once the admin has navigated away from the
 * "Issued" callout. Revoke + reissue is the recovery path.
 */
export function InvitesList({ invites, now }: InvitesListProps) {
  const [showPast, setShowPast] = useState(false);

  const pending = invites.filter((i) => classifyInvite(i, now) === 'pending');
  const past = invites.filter((i) => classifyInvite(i, now) !== 'pending');

  return (
    <div className="flex flex-col gap-5">
      {pending.length === 0 ? (
        <EmptyState>&mdash; No pending invites &mdash;</EmptyState>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {pending.map((invite) => (
            <InviteCard
              key={invite.id}
              invite={invite}
              status="pending"
            />
          ))}
        </ul>
      )}

      {past.length > 0 && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setShowPast((v) => !v)}
            className="font-mono text-ink-soft hover:text-ink flex items-center gap-2 self-start text-[10px] tracking-[0.2em] uppercase transition-colors"
          >
            <span aria-hidden className="inline-block w-3 text-center">
              {showPast ? '\u25BE' : '\u25B8'}
            </span>
            <span>
              {showPast ? 'Hide' : 'Show'} Past Invites &middot;{' '}
              <span className="text-sauce">{past.length}</span>
            </span>
          </button>
          {showPast && (
            <ul className="flex flex-col gap-2.5">
              {past.map((invite) => (
                <InviteCard
                  key={invite.id}
                  invite={invite}
                  status={classifyInvite(invite, now)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   InviteCard — a single invite receipt row
   ========================================================================= */

function InviteCard({
  invite,
  status,
}: {
  invite: Invite;
  status: InviteStatus;
}) {
  const handleRevokeSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!window.confirm(`Revoke invite for ${invite.email}?`)) {
      e.preventDefault();
    }
  };

  return (
    <li
      className={`flex flex-col gap-3 border-[2px] bg-cream px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
        status === 'pending' ? 'border-ink' : 'border-ink/40'
      }`}
    >
      {/* Left — status + email + dates */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-start gap-2">
          <StatusChip status={status} />
          <span className="font-display text-base leading-tight font-bold break-all text-ink sm:text-lg">
            {invite.email}
          </span>
        </div>
        <div className="font-mono flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] tracking-[0.18em] text-ink-soft uppercase">
          <span suppressHydrationWarning>Sent {formatDate(invite.createdAt)}</span>
          {status === 'pending' && (
            <>
              <span aria-hidden>&middot;</span>
              <span suppressHydrationWarning>Expires {formatDate(invite.expiresAt)}</span>
            </>
          )}
          {status === 'claimed' && invite.claimedAt && (
            <>
              <span aria-hidden>&middot;</span>
              <span suppressHydrationWarning>Claimed {formatDate(invite.claimedAt)}</span>
            </>
          )}
          {status === 'expired' && (
            <>
              <span aria-hidden>&middot;</span>
              <span suppressHydrationWarning>Expired {formatDate(invite.expiresAt)}</span>
            </>
          )}
        </div>
        {status === 'pending' && (
          <p className="font-mono text-ink-faded mt-0.5 text-[8.5px] leading-snug tracking-[0.12em] uppercase italic">
            Invite link is only shown once at creation. Revoke &amp; reissue
            if lost.
          </p>
        )}
      </div>

      {/* Right — actions */}
      {status === 'pending' && (
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled
            aria-disabled
            title="The invite link is only shown once at creation. Revoke and reissue if lost."
            className="font-mono text-ink-faded cursor-not-allowed border border-dashed px-3 py-2 text-[10px] tracking-[0.18em] uppercase"
          >
            Copy Link
          </button>
          <form action={revokeInvite} onSubmit={handleRevokeSubmit}>
            <input type="hidden" name="inviteId" value={invite.id} />
            <button
              type="submit"
              className="font-mono border-2 border-sauce bg-cream text-sauce px-3 py-2 text-[10px] font-bold tracking-[0.18em] uppercase transition-colors hover:bg-sauce hover:text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sauce"
            >
              Revoke
            </button>
          </form>
        </div>
      )}
    </li>
  );
}

/* =========================================================================
   Status chip — distinct visual per status
   ========================================================================= */

function StatusChip({ status }: { status: InviteStatus }) {
  const styles: Record<InviteStatus, string> = {
    pending: 'bg-mustard text-ink border-ink',
    claimed: 'bg-basil text-cream border-basil',
    expired: 'bg-cream-deep text-ink-faded border-ink-faded border-dashed',
  };
  return (
    <span
      className={`font-mono inline-flex shrink-0 items-center border px-2 py-0.5 text-[9px] font-bold tracking-[0.2em] uppercase sm:text-[10px] ${styles[status]}`}
    >
      {status}
    </span>
  );
}

/* =========================================================================
   Empty state
   ========================================================================= */

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-ink-faded border-ink-faded/50 bg-cream-deep/30 border border-dashed px-4 py-3 text-[11px] tracking-[0.15em] uppercase italic">
      {children}
    </div>
  );
}
