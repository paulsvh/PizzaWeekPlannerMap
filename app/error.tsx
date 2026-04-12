'use client';

/**
 * Root error boundary — broadsheet "Ink Smeared" crash page.
 * Client Component (required by Next.js). Catches unhandled errors
 * in any route segment and offers a retry button.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 py-8">
      <div className="flex w-full max-w-[480px] flex-col gap-6">
        <div className="font-mono text-[10px] tracking-[0.25em] text-ink-soft uppercase">
          Pressroom Bulletin &nbsp;&middot;&nbsp; Error
        </div>

        <div className="h-[3px] bg-ink" />

        <h1 className="font-display text-[clamp(3rem,13vw,5.5rem)] leading-[0.85] font-black tracking-[-0.03em] text-ink">
          Ink
          <span className="block text-sauce italic">Smeared</span>
        </h1>

        <div className="h-[3px] bg-ink" />

        <p className="font-display text-base leading-relaxed text-ink-soft sm:text-[17px]">
          Something went wrong while printing this page. The presses
          jammed &mdash; try running them again.
        </p>

        {error.message && process.env.NODE_ENV === 'development' && (
          <pre className="font-mono overflow-x-auto border border-dashed border-ink-faded/50 bg-cream-deep/30 px-4 py-3 text-[11px] leading-relaxed text-ink-soft">
            {error.message}
          </pre>
        )}

        <button
          type="button"
          onClick={reset}
          className="group font-mono mt-2 flex items-center justify-between border-2 border-ink bg-cream px-5 py-4 text-sm font-bold tracking-[0.18em] text-ink uppercase transition-colors hover:border-sauce hover:bg-sauce hover:text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sauce sm:text-base"
        >
          <span
            aria-hidden
            className="transition-transform group-hover:-rotate-45"
          >
            &#x21BA;
          </span>
          <span>Try Again</span>
          <span aria-hidden className="w-4" />
        </button>

        <div className="font-mono flex items-center justify-between text-[9px] tracking-[0.2em] text-ink-soft uppercase">
          <span>Printed in PDX</span>
          <span>&sect;</span>
          <span>Error Notice</span>
        </div>
      </div>
    </main>
  );
}
