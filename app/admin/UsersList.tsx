'use client';

import type { User } from '@/lib/types';

type UsersListProps = { users: User[] };

function formatDate(ms: number | null): string {
  if (!ms) return '';
  return new Date(ms).toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/**
 * Subscribers ledger — a grid of member cards. Read-only in MVP;
 * Phase 6.5 will add "revoke user" and "promote to editor" actions.
 *
 * Each card is a broadsheet-styled ID card with display name as the
 * headline, email as the mono caption, a role chip (EDITOR/MEMBER),
 * and timestamps for joined + last login.
 */
export function UsersList({ users }: UsersListProps) {
  if (users.length === 0) {
    return (
      <div className="font-mono text-ink-faded border-ink-faded/50 bg-cream-deep/30 border border-dashed px-4 py-3 text-[11px] tracking-[0.15em] uppercase italic">
        &mdash; No members yet &mdash;
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {users.map((user) => (
        <UserCard key={user.id} user={user} />
      ))}
    </ul>
  );
}

/* =========================================================================
   UserCard — the member ID card
   ========================================================================= */

function UserCard({ user }: { user: User }) {
  return (
    <li className="relative flex flex-col gap-3 border-[2px] border-ink bg-cream px-4 py-3.5 shadow-[3px_3px_0_rgba(22,20,19,0.06)]">
      {/* Header — name + role chip */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg leading-tight font-bold break-words text-ink sm:text-xl">
            {user.displayName || (
              <span className="text-ink-faded italic">(no name)</span>
            )}
          </h3>
          <p className="font-mono mt-0.5 text-[10px] tracking-[0.1em] break-all text-ink-soft uppercase">
            {user.email}
          </p>
        </div>
        <RoleChip role={user.role} />
      </div>

      {/* Metadata rows */}
      <div className="flex flex-col gap-0.5 border-t border-ink/20 pt-2">
        <MetaRow label="Joined" value={formatDate(user.createdAt)} />
        <MetaRow
          label="Last Login"
          value={
            user.lastLoginAt ? (
              formatDate(user.lastLoginAt)
            ) : (
              <span className="text-ink-faded italic">Never</span>
            )
          }
        />
      </div>
    </li>
  );
}

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-mono text-[9px] tracking-[0.2em] text-ink-soft uppercase">
        {label}
      </span>
      <span
        className="font-mono text-[9px] tracking-[0.1em] text-ink uppercase"
        suppressHydrationWarning
      >
        {value}
      </span>
    </div>
  );
}

/* =========================================================================
   Role chip
   ========================================================================= */

function RoleChip({ role }: { role: 'user' | 'admin' }) {
  if (role === 'admin') {
    return (
      <span className="font-mono inline-flex shrink-0 items-center border border-ink bg-ink px-2 py-0.5 text-[9px] font-bold tracking-[0.2em] text-cream uppercase">
        Editor
      </span>
    );
  }
  return (
    <span className="font-mono inline-flex shrink-0 items-center border border-ink bg-cream-deep px-2 py-0.5 text-[9px] font-bold tracking-[0.18em] text-ink uppercase">
      Member
    </span>
  );
}
