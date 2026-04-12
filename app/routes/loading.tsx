/**
 * Routes list loading skeleton — shown by Next.js Suspense while
 * the server component fetches routes from Firestore.
 */
export default function RoutesLoading() {
  return (
    <main className="relative min-h-dvh">
      <nav className="sticky top-0 z-40 border-b-2 border-ink bg-cream/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-3 sm:px-6">
          <div className="font-mono h-4 w-24 animate-pulse rounded bg-ink/10" />
          <div className="font-mono h-4 w-20 animate-pulse rounded bg-ink/10" />
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-5 pt-10 pb-16 sm:pt-14">
        {/* Masthead skeleton */}
        <div className="flex flex-col gap-3">
          <div className="h-3 w-48 animate-pulse rounded bg-ink/10" />
          <div className="h-[3px] bg-ink/20" />
          <div className="h-14 w-64 animate-pulse rounded bg-ink/10" />
          <div className="h-[3px] bg-ink/20" />
          <div className="h-3 w-36 animate-pulse rounded bg-ink/10" />
        </div>

        {/* Card skeletons */}
        <div className="mt-8 flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex flex-col gap-3 border-[1.5px] border-ink/20 bg-cream px-5 py-4"
            >
              <div className="h-4 w-40 animate-pulse rounded bg-ink/10" />
              <div className="h-3 w-56 animate-pulse rounded bg-ink/10" />
              <div className="flex gap-4">
                <div className="h-3 w-16 animate-pulse rounded bg-ink/10" />
                <div className="h-3 w-16 animate-pulse rounded bg-ink/10" />
                <div className="h-3 w-16 animate-pulse rounded bg-ink/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
