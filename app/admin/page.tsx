import { verifyAdminSession } from '@/lib/auth/dal';
import { getAllUsers } from '@/lib/firebase/users';
import { getAllInvites } from '@/lib/firebase/invites';
import { isInviteExpired } from '@/lib/auth/invites';
import { logout } from '@/app/login/actions';
import { InviteForm } from './InviteForm';
import { InvitesList } from './InvitesList';
import { UsersList } from './UsersList';

/**
 * The Editor's Desk — admin panel. Server Component, gated by
 * verifyAdminSession() (which 404s non-admin users so we don't leak
 * the page's existence via a redirect).
 *
 * Three sections:
 *   1. Issue a new invite
 *   2. Pending invites (with past invites collapsed below)
 *   3. Subscribers ledger (all members)
 */
export default async function AdminPage() {
  const session = await verifyAdminSession();

  const [users, invites] = await Promise.all([
    getAllUsers(),
    getAllInvites(),
  ]);

  // Snapshot "now" once on the server so we can pass it to the
  // InvitesList client component and guarantee SSR/hydration agree
  // on which invites are pending vs expired.
  const now = Date.now();
  const pendingCount = invites.filter(
    (i) => !i.claimedAt && !isInviteExpired(i.expiresAt),
  ).length;

  return (
    <main className="flex min-h-dvh flex-col">
      <AdminMasthead displayName={session.displayName} />

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-5 py-8 sm:gap-14 sm:py-12">
        {/* ===== Section 1 — Issue new invite ===== */}
        <section
          className="animate-rise flex flex-col gap-4"
          style={{ animationDelay: '560ms' }}
        >
          <SectionHeader count={null}>Issue New Invite</SectionHeader>
          <InviteForm />
        </section>

        {/* ===== Section 2 — Pending invites ===== */}
        <section
          className="animate-rise flex flex-col gap-4"
          style={{ animationDelay: '680ms' }}
        >
          <SectionHeader count={pendingCount}>Pending Invites</SectionHeader>
          <InvitesList invites={invites} now={now} />
        </section>

        {/* ===== Section 3 — Subscribers ledger ===== */}
        <section
          className="animate-rise flex flex-col gap-4"
          style={{ animationDelay: '800ms' }}
        >
          <SectionHeader count={users.length}>
            Subscribers Ledger
          </SectionHeader>
          <UsersList users={users} />
        </section>
      </div>

      <AdminColophon />
    </main>
  );
}

/* =========================================================================
   Ledger masthead — compact editorial header (not a magazine cover)
   ========================================================================= */

function AdminMasthead({ displayName }: { displayName: string }) {
  return (
    <header className="border-b-[3px] border-ink bg-cream-deep/30">
      <div className="mx-auto max-w-3xl px-5 pt-5 pb-4 sm:pt-7 sm:pb-5">
        {/* Top dateline */}
        <div
          className="font-mono animate-rise mb-2 flex items-center justify-between gap-2 text-[9px] tracking-[0.25em] text-ink-soft uppercase sm:text-[10px]"
          style={{ animationDelay: '100ms' }}
        >
          <span>The Editor&rsquo;s Private Desk</span>
          <span>Vol. I &middot; No. 01</span>
        </div>

        {/* Top rule */}
        <div
          className="animate-slash mb-3 h-[2px] bg-ink"
          style={{ animationDelay: '180ms' }}
        />

        {/* Title row */}
        <div
          className="animate-rise flex items-end justify-between gap-4"
          style={{ animationDelay: '280ms' }}
        >
          <h1 className="font-display text-[clamp(2.5rem,10vw,3.75rem)] leading-[0.88] font-black tracking-[-0.025em] text-ink">
            Editor&rsquo;s <span className="text-sauce italic">Desk</span>
          </h1>

          <form action={logout}>
            <button
              type="submit"
              className="font-mono border-2 border-ink bg-cream px-3 py-2 text-[10px] font-bold tracking-[0.18em] text-ink uppercase transition-colors hover:border-sauce hover:bg-sauce hover:text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sauce sm:px-4 sm:py-2.5 sm:text-[11px]"
            >
              Sign Out
            </button>
          </form>
        </div>

        {/* Bottom rule */}
        <div
          className="animate-slash mt-3 h-[2px] bg-ink"
          style={{ animationDelay: '380ms' }}
        />

        {/* Bottom dateline */}
        <div
          className="font-mono animate-rise mt-2 flex items-center justify-between gap-4 text-[9px] tracking-[0.25em] text-ink-soft uppercase sm:text-[10px]"
          style={{ animationDelay: '460ms' }}
        >
          <span className="truncate">
            Editor: <span className="text-ink">{displayName}</span>
          </span>
          <a
            href="/"
            className="shrink-0 underline-offset-4 transition-colors hover:text-sauce hover:underline"
          >
            &larr; Back to Map
          </a>
        </div>
      </div>
    </header>
  );
}

/* =========================================================================
   Section header — rule-flanked mono caps (reused pattern from sheet)
   ========================================================================= */

function SectionHeader({
  children,
  count,
}: {
  children: React.ReactNode;
  count: number | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="h-[2px] w-8 bg-ink" />
      <h2 className="font-mono flex items-center gap-2 text-[11px] font-bold tracking-[0.25em] whitespace-nowrap text-ink uppercase sm:text-[12px]">
        {children}
        {count !== null && (
          <>
            <span aria-hidden className="text-ink-faded">
              &middot;
            </span>
            <span className="text-sauce">{count}</span>
          </>
        )}
      </h2>
      <span aria-hidden className="h-[2px] flex-1 bg-ink" />
    </div>
  );
}

/* =========================================================================
   Colophon
   ========================================================================= */

function AdminColophon() {
  return (
    <footer className="mt-auto border-t border-ink/30">
      <div className="font-mono mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-4 text-[9px] tracking-[0.2em] text-ink-soft uppercase sm:text-[10px]">
        <span>Printed in PDX</span>
        <span>&sect;</span>
        <span>Editor-Only Bulletin</span>
      </div>
    </footer>
  );
}
