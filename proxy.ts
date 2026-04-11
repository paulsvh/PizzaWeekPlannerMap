import { NextResponse, type NextRequest } from 'next/server';
import { decrypt } from '@/lib/auth/session';

/**
 * Proxy (formerly Middleware in Next.js < 16).
 *
 * This is a UX-only redirect. Real auth checks live in
 * `lib/auth/dal.ts` (`verifySession`, `verifyAdminSession`) and must
 * be called from every Server Action, Route Handler, and authed page.
 * Per the Next.js 16 docs, proxy must not be the only line of defense.
 *
 * Routing rules:
 *   - `/login` and `/invite/{token}` are PUBLIC (unauth users must be
 *     able to reach them — `/invite/{token}` is literally the entry
 *     point for brand-new friends who don't yet have an account).
 *   - Every other route requires a session cookie; unauth → /login.
 *   - Logged-in users hitting a public route get bounced to /.
 *     (If you're testing and want to inspect an invite URL while
 *     signed in, sign out first.)
 */

function isPublicRoute(pathname: string): boolean {
  if (pathname === '/login') return true;
  if (pathname === '/invite' || pathname.startsWith('/invite/')) return true;
  return false;
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('pw_session')?.value;
  const session = await decrypt(token);

  const isPublic = isPublicRoute(pathname);

  if (!session && !isPublic) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (session && isPublic) {
    const homeUrl = new URL('/', request.url);
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match everything except Next.js internals, static assets, and favicons.
    '/((?!_next/static|_next/image|_next/data|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|gif|ico|txt|xml)$).*)',
  ],
};
