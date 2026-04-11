import { getInviteByToken } from '@/lib/firebase/invites';
import { isInviteExpired } from '@/lib/auth/invites';
import { ClaimForm } from './ClaimForm';

type PageProps = {
  params: Promise<{ token: string }>;
};

type NoticeVariant = 'not-found' | 'expired' | 'claimed';

/**
 * Invite claim page. Server Component — validates the invite via
 * Firestore Admin SDK, then either renders a broadsheet notice for
 * the three failure states or hands the valid case off to the
 * client-side ClaimForm.
 *
 * Next.js 16 gotcha: `params` is a Promise that must be awaited.
 */
export default async function InviteClaimPage({ params }: PageProps) {
  const { token } = await params;
  const invite = await getInviteByToken(token);

  if (!invite) {
    return <InviteNotice variant="not-found" />;
  }
  if (invite.claimedAt) {
    return <InviteNotice variant="claimed" />;
  }
  if (isInviteExpired(invite.expiresAt)) {
    return <InviteNotice variant="expired" />;
  }

  // Format the expiry once on the server so we don't hit locale/TZ
  // hydration mismatches on the client.
  const expiresAtFormatted = new Date(invite.expiresAt).toLocaleString(
    'en-US',
    {
      timeZone: 'America/Los_Angeles',
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  );

  return (
    <ClaimForm
      token={token}
      email={invite.email}
      inviterName={invite.createdByDisplayName}
      expiresAtFormatted={expiresAtFormatted}
    />
  );
}

/* =========================================================================
   InviteNotice — broadsheet "Pressroom Bulletin" for the three failure
   states. Each variant has its own dateline, title, body copy, and
   footnote, but shares the overall composition.
   ========================================================================= */

type NoticeConfig = {
  dateline: string;
  title: string;
  italic: string;
  body: string;
  footnote: string;
};

const NOTICE_COPY: Record<NoticeVariant, NoticeConfig> = {
  'not-found': {
    dateline: 'Pressroom Bulletin · Dead Letter',
    title: 'Invite',
    italic: 'Not Found',
    body: 'The link you followed doesn\u2019t match any invite on file. It may have been revoked by the editor, mistyped, or never existed in the first place.',
    footnote:
      'If you believe this is in error, ask your friend to reissue the invite from the editor\u2019s desk.',
  },
  expired: {
    dateline: 'Pressroom Bulletin · Edition Lapsed',
    title: 'Invite',
    italic: 'Expired',
    body: 'This invitation has passed its expiration date. Invites are good for seven days from issue \u2014 ask your friend to send a fresh one.',
    footnote:
      'The seven-day limit keeps the door from being left open. It\u2019s a feature, not a bug.',
  },
  claimed: {
    dateline: 'Pressroom Bulletin · Seat Taken',
    title: 'Already',
    italic: 'Claimed',
    body: 'This invite has already been used. If you\u2019re the person who claimed it, head to the sign-in page and enter with your email and password.',
    footnote:
      'Each invite works exactly once. A security rule, not a misfire.',
  },
};

function InviteNotice({ variant }: { variant: NoticeVariant }) {
  const c = NOTICE_COPY[variant];

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 py-8 sm:py-14">
      <div className="flex w-full max-w-[480px] flex-col gap-5">
        <div
          className="font-mono animate-rise text-[10px] tracking-[0.25em] text-ink-soft uppercase sm:text-[11px]"
          style={{ animationDelay: '100ms' }}
        >
          {c.dateline}
        </div>

        <div
          className="animate-slash h-[3px] bg-ink"
          style={{ animationDelay: '180ms' }}
        />

        <h1
          className="font-display animate-rise text-[clamp(4rem,18vw,6.5rem)] leading-[0.85] font-black tracking-[-0.035em] text-ink"
          style={{ animationDelay: '280ms' }}
        >
          <span className="block">{c.title}</span>
          <span className="block text-sauce italic">{c.italic}</span>
        </h1>

        <div
          className="animate-slash h-[3px] bg-ink"
          style={{ animationDelay: '380ms' }}
        />

        <p
          className="font-display animate-rise text-base leading-relaxed text-ink-soft sm:text-[17px]"
          style={{ animationDelay: '500ms' }}
        >
          {c.body}
        </p>

        <div
          className="animate-rise border-l-[3px] border-sauce pl-3"
          style={{ animationDelay: '580ms' }}
        >
          <p className="font-display text-sm leading-relaxed text-ink-faded italic sm:text-[15px]">
            {c.footnote}
          </p>
        </div>

        <a
          href="/login"
          className="group font-mono animate-rise mt-2 flex items-center justify-between border-2 border-ink bg-cream px-5 py-4 text-sm font-bold tracking-[0.18em] text-ink uppercase transition-colors hover:border-ink hover:bg-ink hover:text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sauce sm:text-base"
          style={{ animationDelay: '700ms' }}
        >
          <span
            aria-hidden
            className="transition-transform group-hover:-translate-x-1"
          >
            &larr;
          </span>
          <span>Return to Sign In</span>
          <span aria-hidden className="w-4" />
        </a>

        <footer
          className="animate-rise flex flex-col gap-3"
          style={{ animationDelay: '820ms' }}
        >
          <div aria-hidden className="h-[2px] bg-ink" />
          <div className="font-mono flex items-center justify-between text-[9px] tracking-[0.2em] text-ink-soft uppercase sm:text-[10px]">
            <span>Printed in PDX</span>
            <span>&sect;</span>
            <span>Technical Notice</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
