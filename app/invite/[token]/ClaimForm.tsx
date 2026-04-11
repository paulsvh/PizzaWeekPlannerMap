'use client';

import { useActionState } from 'react';
import { claimInvite, type ClaimState } from '@/app/invite/[token]/actions';

type ClaimFormProps = {
  token: string;
  email: string;
  inviterName: string;
  expiresAtFormatted: string;
};

const initialState: ClaimState = undefined;

/**
 * The "engraved invitation" claim form. Two stacked compositions:
 *
 *   1. Ticket stub voucher — border-double (engraved-card look) with
 *      the invited email, inviter, and expiry rendered as immutable
 *      metadata. Rotated INVITATION stamp in the corner.
 *   2. Entry form — dashed-border signup form for displayName, password,
 *      passwordConfirm, submitting to the claimInvite Server Action.
 *
 * The two compositions are visually connected but clearly distinct —
 * the stub is a receipt you're holding, the entry form is the clerk's
 * window where you actually sign in.
 */
export function ClaimForm({
  token,
  email,
  inviterName,
  expiresAtFormatted,
}: ClaimFormProps) {
  const [state, formAction, isPending] = useActionState(
    claimInvite,
    initialState,
  );

  const displayNameError = state?.errors?.displayName?.[0];
  const passwordError = state?.errors?.password?.[0];
  const passwordConfirmError = state?.errors?.passwordConfirm?.[0];
  const formError = state?.errors?.form?.[0];

  return (
    <main className="relative flex min-h-dvh flex-col items-center overflow-hidden px-5 py-8 sm:py-14">
      <div className="flex w-full max-w-[480px] flex-col gap-7">
        {/* ===== Masthead ===== */}
        <header className="flex flex-col gap-3">
          <div
            className="font-mono animate-rise text-[10px] tracking-[0.25em] text-ink-soft uppercase sm:text-[11px]"
            style={{ animationDelay: '100ms' }}
          >
            Engraved Invitation &nbsp;&middot;&nbsp; By Hand
          </div>

          <div
            className="animate-slash h-[3px] bg-ink"
            style={{ animationDelay: '180ms' }}
          />

          <h1
            className="font-display animate-rise leading-[0.82] tracking-[-0.035em] text-ink"
            style={{ animationDelay: '280ms' }}
          >
            <span className="block text-[clamp(4.5rem,21vw,7rem)] font-black">
              Welcome
            </span>
            <span className="-mt-[0.08em] block text-[clamp(3rem,13vw,4.5rem)] font-black text-sauce italic">
              to the Crew
            </span>
          </h1>

          <div
            className="animate-slash h-[3px] bg-ink"
            style={{ animationDelay: '380ms' }}
          />

          <div
            className="font-mono animate-rise flex items-center justify-between text-[10px] tracking-[0.2em] text-ink-soft uppercase sm:text-[11px]"
            style={{ animationDelay: '460ms' }}
          >
            <span>Portland</span>
            <span aria-hidden>&middot;</span>
            <span>Apr 20&mdash;26</span>
            <span aria-hidden>&middot;</span>
            <span>2026</span>
          </div>
        </header>

        {/* ===== Ticket stub voucher (invitation metadata) ===== */}
        <div
          className="animate-rise relative flex flex-col gap-3 border-[5px] border-double border-ink bg-cream-deep/40 p-4 sm:p-5"
          style={{ animationDelay: '560ms' }}
        >
          {/* Rotated INVITATION stamp */}
          <div
            aria-hidden
            className="animate-stamp pointer-events-none absolute top-[-14px] right-[-10px] sm:right-[-4px]"
            style={{ animationDelay: '780ms' }}
          >
            <div className="font-mono rotate-[-7deg] border-[2.5px] border-sauce bg-cream px-2.5 py-1 text-[9px] leading-tight font-bold tracking-[0.2em] text-sauce uppercase shadow-[3px_3px_0_rgba(179,33,19,0.15)] sm:text-[10px]">
              Invitation
            </div>
          </div>

          <div className="flex items-start justify-between gap-3 border-b border-ink pb-2">
            <span className="font-mono text-[9px] font-bold tracking-[0.22em] uppercase">
              &#9662; Ticket Stub
            </span>
            <span className="font-mono text-[9px] tracking-[0.22em] text-ink-soft uppercase">
              Non-Transferable
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[9px] font-bold tracking-[0.25em] text-sauce uppercase">
              Invited As
            </span>
            <span className="font-display text-lg leading-tight break-all text-ink sm:text-xl">
              {email}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-ink/30 pt-2">
            <span className="font-mono text-[9px] tracking-[0.2em] text-ink-soft uppercase">
              From
            </span>
            <span className="font-mono max-w-[60%] truncate text-[10px] tracking-[0.1em] text-ink uppercase">
              {inviterName}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[9px] tracking-[0.2em] text-ink-soft uppercase">
              Expires
            </span>
            <span
              className="font-mono text-[10px] tracking-[0.1em] text-ink uppercase"
              suppressHydrationWarning
            >
              {expiresAtFormatted}
            </span>
          </div>
        </div>

        {/* ===== Entry form ===== */}
        <form
          action={formAction}
          noValidate
          className={`animate-rise flex flex-col gap-5 border-[2.5px] border-dashed border-ink bg-cream/40 p-5 sm:p-6 ${
            formError ? 'animate-shake' : ''
          }`}
          style={{ animationDelay: '680ms' }}
        >
          <input type="hidden" name="token" value={token} />

          {/* Form header */}
          <div className="-mt-1 flex items-end justify-between border-b-2 border-ink pb-2">
            <span className="font-mono text-[11px] font-bold tracking-[0.2em] uppercase">
              &#9660; Claim Form
            </span>
            <span className="font-mono text-[9px] tracking-[0.22em] text-ink-soft uppercase">
              Please Print
            </span>
          </div>

          {/* Field 01 — Display name */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="displayName"
              className="flex items-baseline gap-2"
            >
              <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-sauce uppercase">
                01
              </span>
              <span className="font-mono text-[10px] tracking-[0.2em] text-ink-soft uppercase">
                Your display name
              </span>
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              required
              autoFocus
              maxLength={40}
              autoComplete="nickname"
              autoCapitalize="words"
              spellCheck={false}
              aria-invalid={!!displayNameError}
              aria-describedby={
                displayNameError ? 'displayName-error' : undefined
              }
              placeholder="e.g. Marco"
              className="font-display w-full border-0 border-b-2 border-ink bg-transparent pt-1 pb-1 text-xl text-ink placeholder:text-ink-faded/60 focus:border-b-[3px] focus:border-sauce focus:outline-none aria-[invalid=true]:border-sauce sm:text-2xl"
            />
            {displayNameError && (
              <p
                id="displayName-error"
                className="font-mono text-[11px] tracking-wider text-sauce uppercase"
              >
                &rarr; {displayNameError}
              </p>
            )}
          </div>

          {/* Field 02 — Password */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="flex items-baseline gap-2">
              <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-sauce uppercase">
                02
              </span>
              <span className="font-mono text-[10px] tracking-[0.2em] text-ink-soft uppercase">
                Pick a password &mdash; 8+ chars
              </span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              aria-invalid={!!passwordError}
              aria-describedby={passwordError ? 'password-error' : undefined}
              placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
              className="font-mono w-full border-0 border-b-2 border-ink bg-transparent pt-1 pb-1 text-xl tracking-[0.3em] text-ink placeholder:text-ink-faded/50 focus:border-b-[3px] focus:border-sauce focus:outline-none aria-[invalid=true]:border-sauce sm:text-2xl"
            />
            {passwordError && (
              <p
                id="password-error"
                className="font-mono text-[11px] tracking-wider text-sauce uppercase"
              >
                &rarr; {passwordError}
              </p>
            )}
          </div>

          {/* Field 03 — Confirm password */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="passwordConfirm"
              className="flex items-baseline gap-2"
            >
              <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-sauce uppercase">
                03
              </span>
              <span className="font-mono text-[10px] tracking-[0.2em] text-ink-soft uppercase">
                Confirm it
              </span>
            </label>
            <input
              id="passwordConfirm"
              name="passwordConfirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              aria-invalid={!!passwordConfirmError}
              aria-describedby={
                passwordConfirmError ? 'passwordConfirm-error' : undefined
              }
              placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
              className="font-mono w-full border-0 border-b-2 border-ink bg-transparent pt-1 pb-1 text-xl tracking-[0.3em] text-ink placeholder:text-ink-faded/50 focus:border-b-[3px] focus:border-sauce focus:outline-none aria-[invalid=true]:border-sauce sm:text-2xl"
            />
            {passwordConfirmError && (
              <p
                id="passwordConfirm-error"
                className="font-mono text-[11px] tracking-wider text-sauce uppercase"
              >
                &rarr; {passwordConfirmError}
              </p>
            )}
          </div>

          {/* Form-level error */}
          {formError && (
            <div
              id="form-error"
              role="alert"
              className="flex items-start gap-3 border-l-[3px] border-sauce bg-sauce/5 py-1 pl-3"
            >
              <span className="font-mono text-[10px] font-bold tracking-[0.25em] text-sauce uppercase">
                Stop&mdash;
              </span>
              <p className="font-display text-sm text-ink">{formError}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending}
            className="group font-mono mt-1 flex items-center justify-between border-2 border-ink bg-ink px-5 py-4 text-sm font-bold tracking-[0.18em] text-cream uppercase transition-colors hover:border-sauce hover:bg-sauce focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sauce disabled:cursor-wait disabled:opacity-60 sm:text-base"
          >
            <span>{isPending ? 'Claiming\u2026' : 'Claim Your Seat'}</span>
            <span
              aria-hidden
              className="transition-transform group-hover:translate-x-1 group-disabled:translate-x-0"
            >
              {isPending ? '\u22EF' : '\u2192'}
            </span>
          </button>

          <p className="font-mono text-center text-[9px] tracking-[0.18em] text-ink-soft/70 uppercase">
            This replaces your shared-passcode era. From now on it&rsquo;s just
            you.
          </p>
        </form>

        {/* ===== Colophon ===== */}
        <footer
          className="animate-rise flex flex-col gap-3"
          style={{ animationDelay: '860ms' }}
        >
          <div aria-hidden className="h-[2px] bg-ink" />
          <div className="font-mono flex items-center justify-between text-[9px] tracking-[0.2em] text-ink-soft uppercase sm:text-[10px]">
            <span>Printed in PDX</span>
            <span>&sect;</span>
            <span>One Seat At A Time</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
