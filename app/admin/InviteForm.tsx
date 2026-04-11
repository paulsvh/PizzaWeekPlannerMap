'use client';

import { useActionState, useState } from 'react';
import { createInvite, type CreateInviteState } from '@/app/admin/actions';

const initialState: CreateInviteState = undefined;

/**
 * The "issue new invite" form on the admin panel.
 *
 * Has two faces:
 *   1. Entry form — dashed-border "Send Invite" box with a single
 *      email input and a submit button. Same vocabulary as the login
 *      page.
 *   2. Success callout — a heavy-bordered "ISSUED" card that replaces
 *      the form on success, showing the new invite URL prominently
 *      with a copy-to-clipboard button. Always shows the URL (not
 *      just a "sent" confirmation) because that's the only moment
 *      the plaintext token exists — once the callout is dismissed,
 *      the token is unrecoverable and the admin must revoke + reissue.
 *
 * The "Issue Another" button re-mounts the form via a key bump, which
 * clears the useActionState.
 */
export function InviteForm() {
  const [formKey, setFormKey] = useState(0);

  return <InviteFormInner key={formKey} onReset={() => setFormKey((k) => k + 1)} />;
}

function InviteFormInner({ onReset }: { onReset: () => void }) {
  const [state, formAction, isPending] = useActionState(
    createInvite,
    initialState,
  );
  const [copied, setCopied] = useState(false);

  const emailError = state?.errors?.email?.[0];
  const formError = state?.errors?.form?.[0];
  const success = state?.success;

  async function handleCopy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API failed (insecure context, permissions, etc.) —
      // the URL is also displayed in a pre block so the admin can
      // select it manually.
    }
  }

  if (success) {
    return (
      <SuccessCallout
        email={success.email}
        inviteUrl={success.inviteUrl}
        emailSent={success.emailSent}
        copied={copied}
        onCopy={handleCopy}
        onReset={onReset}
      />
    );
  }

  return (
    <form
      action={formAction}
      noValidate
      className={`flex flex-col gap-5 border-[2.5px] border-dashed border-ink bg-cream/40 p-5 sm:p-6 ${
        formError ? 'animate-shake' : ''
      }`}
    >
      {/* Form header */}
      <div className="-mt-1 flex items-end justify-between border-b-2 border-ink pb-2">
        <span className="font-mono text-[11px] font-bold tracking-[0.2em] uppercase">
          &#9660; Send Invite
        </span>
        <span className="font-mono text-[9px] tracking-[0.22em] text-ink-soft uppercase">
          Editor Only
        </span>
      </div>

      {/* Recipient email */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="invite-email" className="flex items-baseline gap-2">
          <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-sauce uppercase">
            01
          </span>
          <span className="font-mono text-[10px] tracking-[0.2em] text-ink-soft uppercase">
            Recipient email
          </span>
        </label>
        <input
          id="invite-email"
          name="email"
          type="email"
          required
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          inputMode="email"
          aria-invalid={!!emailError}
          aria-describedby={emailError ? 'invite-email-error' : undefined}
          placeholder="friend@example.com"
          className="font-display w-full border-0 border-b-2 border-ink bg-transparent pt-1 pb-1 text-xl text-ink placeholder:text-ink-faded/60 focus:border-b-[3px] focus:border-sauce focus:outline-none aria-[invalid=true]:border-sauce sm:text-2xl"
        />
        {emailError && (
          <p
            id="invite-email-error"
            className="font-mono text-[11px] tracking-wider text-sauce uppercase"
          >
            &rarr; {emailError}
          </p>
        )}
      </div>

      {/* Form-level error */}
      {formError && (
        <div
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
        <span>{isPending ? 'Issuing\u2026' : 'Issue Invite'}</span>
        <span
          aria-hidden
          className="transition-transform group-hover:translate-x-1 group-disabled:translate-x-0"
        >
          {isPending ? '\u22EF' : '\u2192'}
        </span>
      </button>

      <p className="font-mono text-center text-[9px] tracking-[0.18em] text-ink-soft/70 uppercase">
        Invites expire in 7 days. Single-use only.
      </p>
    </form>
  );
}

/* =========================================================================
   Success callout — the "ISSUED" card with the new invite URL
   ========================================================================= */

type SuccessProps = {
  email: string;
  inviteUrl: string;
  emailSent: boolean;
  copied: boolean;
  onCopy: (url: string) => void;
  onReset: () => void;
};

function SuccessCallout({
  email,
  inviteUrl,
  emailSent,
  copied,
  onCopy,
  onReset,
}: SuccessProps) {
  return (
    <div className="animate-rise relative flex flex-col gap-4 border-[3px] border-ink bg-cream-deep/50 p-5 sm:p-6">
      {/* Rotated ISSUED stamp */}
      <div
        aria-hidden
        className="animate-stamp pointer-events-none absolute top-[-14px] right-[-10px] sm:right-[-4px]"
      >
        <div
          className={`font-mono rotate-[-7deg] border-[2.5px] bg-cream px-2.5 py-1 text-[9px] leading-tight font-bold tracking-[0.2em] uppercase shadow-[3px_3px_0_rgba(22,20,19,0.2)] sm:text-[10px] ${
            emailSent
              ? 'border-basil text-basil'
              : 'border-sauce text-sauce'
          }`}
        >
          Issued
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[10px] font-bold tracking-[0.25em] text-sauce uppercase sm:text-[11px]">
          &#x2713; Invite Created
        </span>
        <h3 className="font-display pr-16 text-xl leading-tight text-ink sm:text-2xl">
          For <span className="italic">{email}</span>
        </h3>
      </div>

      {/* Delivery status + always-visible URL */}
      {emailSent ? (
        <div className="flex items-start gap-3 border-[1.5px] border-basil bg-cream px-3 py-2.5">
          <span className="font-mono mt-0.5 text-[10px] font-bold tracking-[0.22em] text-basil uppercase">
            &#9993;
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-basil uppercase">
              Email Sent
            </span>
            <span className="font-mono truncate text-[10px] tracking-[0.1em] text-ink-soft uppercase">
              {email}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 border-l-[3px] border-sauce bg-sauce/5 py-1 pl-3">
          <div className="flex-1">
            <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-sauce uppercase">
              Manual Delivery
            </span>
            <p className="font-display mt-0.5 text-sm leading-snug text-ink">
              Email isn&rsquo;t configured. Copy the link below and send it to{' '}
              <span className="font-bold">{email}</span> directly.
            </p>
          </div>
        </div>
      )}

      {/* The invite URL — always visible, copy button below */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span aria-hidden className="h-[2px] w-6 bg-ink" />
          <span className="font-mono text-[9px] font-bold tracking-[0.22em] text-ink uppercase">
            Invite URL &middot; Copy Now &mdash; It Won&rsquo;t Reappear
          </span>
          <span aria-hidden className="h-[2px] flex-1 bg-ink" />
        </div>
        <div className="font-mono overflow-x-auto border border-ink bg-ink px-3 py-2.5 text-[11px] leading-relaxed break-all text-cream select-all">
          {inviteUrl}
        </div>
      </div>

      {/* Copy button */}
      <button
        type="button"
        onClick={() => onCopy(inviteUrl)}
        className="group font-mono flex items-center justify-between border-2 border-ink bg-ink px-5 py-4 text-sm font-bold tracking-[0.18em] text-cream uppercase transition-colors hover:border-sauce hover:bg-sauce focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sauce sm:text-base"
      >
        <span>{copied ? 'Copied to Clipboard' : 'Copy Invite Link'}</span>
        <span
          aria-hidden
          className="transition-transform group-hover:translate-x-1"
        >
          {copied ? '\u2713' : '\u29C9'}
        </span>
      </button>

      {/* Reset */}
      <button
        type="button"
        onClick={onReset}
        className="font-mono text-ink-soft hover:text-sauce self-start text-[11px] tracking-[0.18em] uppercase underline-offset-4 transition-colors hover:underline"
      >
        &rarr; Issue Another Invite
      </button>
    </div>
  );
}
