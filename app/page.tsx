import { verifySession } from '@/lib/auth/dal';
import { logout } from '@/app/login/actions';

/**
 * Phase 1 placeholder home page.
 *
 * This will be replaced in Phase 3 with the full-screen Google Maps view
 * showing Pizza Week restaurant pins. For now it just proves the auth loop
 * is working end-to-end.
 */
export default async function HomePage() {
  const session = await verifySession();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">🍕 Pizza Week Planner</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Logged in as <strong>{session.displayName}</strong>
      </p>
      <p className="max-w-md text-center text-sm text-zinc-500">
        The map comes in Phase 3. For now this page just confirms the passcode + session loop works.
      </p>
      <form action={logout}>
        <button
          type="submit"
          className="rounded-full border border-zinc-300 px-5 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Log out
        </button>
      </form>
    </main>
  );
}
