'use client';

import { useActionState, useState } from 'react';
import { login, type LoginState } from '@/app/login/actions';

const initialState: LoginState = undefined;

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, initialState);
  const [showPassword, setShowPassword] = useState(false);

  const emailError = state?.errors?.email?.[0];
  const passwordError = state?.errors?.password?.[0];
  const formError = state?.errors?.form?.[0];

  return (
    <main className="relative flex min-h-dvh flex-col items-center overflow-hidden px-5 py-8 sm:py-14">
      {/* SPECIAL EDITION stamp — rotated into the top-right corner */}
      <div
        aria-hidden
        className="animate-stamp pointer-events-none absolute top-6 right-[-18px] sm:top-10 sm:right-4"
        style={{ animationDelay: '950ms' }}
      >
        <div className="font-mono rotate-[-8deg] border-[2.5px] border-sauce bg-cream/70 px-3 py-1.5 text-center text-[9px] leading-[1.15] font-bold tracking-[0.2em] text-sauce uppercase shadow-[3px_3px_0_rgba(179,33,19,0.15)] backdrop-blur-[1px] sm:text-[11px]">
          Special
          <br />
          Edition
        </div>
      </div>

      <div className="flex w-full max-w-[460px] flex-col gap-8">
        {/* ===== Masthead ===== */}
        <header className="flex flex-col gap-3">
          <div
            className="font-mono animate-rise text-[10px] tracking-[0.25em] text-ink-soft uppercase sm:text-[11px]"
            style={{ animationDelay: '100ms' }}
          >
            Vol. I &nbsp;·&nbsp; No. 01 &nbsp;·&nbsp; Spring &rsquo;26
          </div>

          <div
            className="animate-slash h-[3px] bg-ink"
            style={{ animationDelay: '180ms' }}
          />

          <h1
            className="font-display animate-rise leading-[0.82] tracking-[-0.035em] text-ink"
            style={{ animationDelay: '280ms' }}
          >
            <span className="block text-[clamp(4.5rem,22vw,7rem)] font-black">
              Pizza
            </span>
            <span className="-mt-[0.12em] block text-[clamp(4.5rem,22vw,7rem)] font-black text-sauce italic">
              Week
            </span>
            <span className="block text-[clamp(4.5rem,22vw,7rem)] font-black">
              Planner
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
            <span aria-hidden>·</span>
            <span>Apr 20&mdash;26</span>
            <span aria-hidden>·</span>
            <span>2026</span>
          </div>
        </header>

        {/* ===== Lede ===== */}
        <section
          className="animate-rise flex flex-col gap-4"
          style={{ animationDelay: '560ms' }}
        >
          <div className="flex gap-3">
            <span aria-hidden className="w-[3px] shrink-0 bg-sauce" />
            <div>
              <h2 className="font-display text-xl leading-[0.95] font-bold uppercase sm:text-2xl">
                A Private
                <br />
                Bulletin
              </h2>
              <p className="font-mono mt-1.5 text-[10px] tracking-[0.2em] text-ink-soft uppercase sm:text-[11px]">
                For the Pizza Intelligentsia
              </p>
            </div>
          </div>
          <p className="font-display text-base leading-relaxed text-ink-soft sm:text-[17px]">
            The planning desk for the 2026 Portland Pizza Week crawl. Your editors
            have plotted the pies, measured the miles, and worn the grease. Sign
            in with the email your admin invited and the password you set on
            claim. No invite yet?{' '}
            <span className="font-mono text-[11px] tracking-[0.15em] uppercase text-sauce">
              Ask the editor in chief.
            </span>
          </p>
        </section>

        {/* ===== Entry Form ===== */}
        <form
          action={formAction}
          noValidate
          className={`animate-rise flex flex-col gap-5 border-[2.5px] border-dashed border-ink bg-cream/40 p-5 sm:p-6 ${
            formError ? 'animate-shake' : ''
          }`}
          style={{ animationDelay: '720ms' }}
        >
          {/* Form header — like a stamped print form title */}
          <div className="-mt-1 flex items-end justify-between border-b-2 border-ink pb-2">
            <span className="font-mono text-[11px] font-bold tracking-[0.2em] uppercase">
              &#9660; Entry Form
            </span>
            <span className="font-mono text-[9px] tracking-[0.22em] text-ink-soft uppercase">
              Please print
            </span>
          </div>

          {/* Field 01 — Email */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="flex items-baseline gap-2">
              <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-sauce uppercase">
                01
              </span>
              <span className="font-mono text-[10px] tracking-[0.2em] text-ink-soft uppercase">
                Email address
              </span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              inputMode="email"
              aria-invalid={!!emailError}
              aria-describedby={emailError ? 'email-error' : undefined}
              placeholder="reader@paper.com"
              className="font-display w-full border-0 border-b-2 border-ink bg-transparent pt-1 pb-1 text-xl text-ink placeholder:text-ink-faded/60 focus:border-b-[3px] focus:border-sauce focus:outline-none aria-[invalid=true]:border-sauce sm:text-2xl"
            />
            {emailError && (
              <p
                id="email-error"
                className="font-mono text-[11px] tracking-wider text-sauce uppercase"
              >
                &rarr; {emailError}
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
                Password
              </span>
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                aria-invalid={!!passwordError || !!formError}
                aria-describedby={
                  passwordError
                    ? 'password-error'
                    : formError
                      ? 'form-error'
                      : undefined
                }
                placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                className="font-mono w-full border-0 border-b-2 border-ink bg-transparent pt-1 pr-16 pb-1 text-xl tracking-[0.3em] text-ink placeholder:text-ink-faded/50 focus:border-b-[3px] focus:border-sauce focus:outline-none aria-[invalid=true]:border-sauce sm:text-2xl"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="font-mono absolute right-0 bottom-1.5 border border-ink bg-cream px-2 py-0.5 text-[9px] font-bold tracking-[0.18em] text-ink uppercase transition-colors hover:bg-mustard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sauce"
              >
                {showPassword ? '\u25C6 Hide' : '\u25C7 Show'}
              </button>
            </div>
            {passwordError && (
              <p
                id="password-error"
                className="font-mono text-[11px] tracking-wider text-sauce uppercase"
              >
                &rarr; {passwordError}
              </p>
            )}
          </div>

          {/* Form-level error — editorial "STOP —" callout */}
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

          {/* Submit — heavy ink block button */}
          <button
            type="submit"
            disabled={isPending}
            className="group font-mono mt-1 flex items-center justify-between border-2 border-ink bg-ink px-5 py-4 text-sm font-bold tracking-[0.18em] text-cream uppercase transition-colors hover:border-sauce hover:bg-sauce focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sauce disabled:cursor-wait disabled:opacity-60 sm:text-base"
          >
            <span>{isPending ? 'Checking In\u2026' : 'Check In'}</span>
            <span
              aria-hidden
              className="transition-transform group-hover:translate-x-1 group-disabled:translate-x-0"
            >
              {isPending ? '\u22EF' : '\u2192'}
            </span>
          </button>

          {/* Fine print at the bottom of the form */}
          <p className="font-mono text-center text-[9px] tracking-[0.18em] text-ink-soft/70 uppercase">
            A private bulletin. Unauthorized readers will be chased off with a
            pizza peel.
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
            <span>No Slices Harmed</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
