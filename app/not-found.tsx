import Link from 'next/link';

/**
 * Custom 404 page — broadsheet "Stop the Presses" notice.
 * Renders for any route that doesn't match or when notFound() is
 * called (e.g. missing route detail page).
 */
export default function NotFound() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 py-8">
      <div className="flex w-full max-w-[480px] flex-col gap-6">
        <div
          className="font-mono animate-rise text-[10px] tracking-[0.25em] text-ink-soft uppercase"
          style={{ animationDelay: '100ms' }}
        >
          Pressroom Bulletin &nbsp;&middot;&nbsp; 404
        </div>

        <div
          className="animate-slash h-[3px] bg-ink"
          style={{ animationDelay: '180ms' }}
        />

        <h1
          className="font-display animate-rise text-[clamp(3rem,13vw,5.5rem)] leading-[0.85] font-black tracking-[-0.03em] text-ink"
          style={{ animationDelay: '280ms' }}
        >
          Page
          <span className="block text-sauce italic">Not Found</span>
        </h1>

        <div
          className="animate-slash h-[3px] bg-ink"
          style={{ animationDelay: '380ms' }}
        />

        <p
          className="font-display animate-rise text-base leading-relaxed text-ink-soft sm:text-[17px]"
          style={{ animationDelay: '500ms' }}
        >
          That edition doesn&rsquo;t exist. It may have been pulled from
          the archive, or the address was mistyped.
        </p>

        <Link
          href="/"
          className="group font-mono animate-rise mt-2 flex items-center justify-between border-2 border-ink bg-cream px-5 py-4 text-sm font-bold tracking-[0.18em] text-ink uppercase transition-colors hover:border-ink hover:bg-ink hover:text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sauce sm:text-base"
          style={{ animationDelay: '620ms' }}
        >
          <span
            aria-hidden
            className="transition-transform group-hover:-translate-x-1"
          >
            &larr;
          </span>
          <span>Back to the Map</span>
          <span aria-hidden className="w-4" />
        </Link>

        <div
          className="font-mono animate-rise flex items-center justify-between text-[9px] tracking-[0.2em] text-ink-soft uppercase"
          style={{ animationDelay: '780ms' }}
        >
          <span>Printed in PDX</span>
          <span>&sect;</span>
          <span>404 Notice</span>
        </div>
      </div>
    </main>
  );
}
