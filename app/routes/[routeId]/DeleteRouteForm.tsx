'use client';

import { deleteRouteAction } from '@/app/routes/[routeId]/actions';

type DeleteRouteFormProps = {
  routeId: string;
};

/**
 * DeleteRouteForm — sauce-red dashed-border button with a
 * confirm() guard. Submits to the deleteRouteAction Server Action,
 * which verifies ownership server-side, deletes the route doc, and
 * cascades the vote cleanup before redirecting to /routes.
 *
 * Confirmation can't be silently bypassed: if the user dismisses
 * the confirm dialog we call e.preventDefault() to cancel the
 * submission.
 */
export function DeleteRouteForm({ routeId }: DeleteRouteFormProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (
      !window.confirm(
        'Delete this route forever? This cannot be undone.',
      )
    ) {
      e.preventDefault();
    }
  };

  return (
    <form action={deleteRouteAction} onSubmit={handleSubmit}>
      <input type="hidden" name="routeId" value={routeId} />
      <button
        type="submit"
        className="font-mono group flex w-full items-center justify-between border-2 border-dashed border-sauce/60 bg-cream px-5 py-4 text-sm font-bold tracking-[0.18em] text-sauce uppercase transition-colors hover:border-sauce hover:bg-sauce hover:text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sauce sm:text-base"
      >
        <span>Delete Route</span>
        <span
          aria-hidden
          className="font-mono text-[9px] tracking-[0.2em]"
        >
          Creator Only
        </span>
      </button>
    </form>
  );
}
