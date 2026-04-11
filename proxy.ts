import { NextResponse, type NextRequest } from 'next/server';
import { decrypt } from '@/lib/auth/session';

/**
 * Proxy (formerly Middleware in Next.js < 16).
 *
 * This is a UX-only redirect: unauthenticated visitors get bounced to
 * /login, and logged-in users hitting /login get bounced to /. Real auth
 * checks live in `lib/auth/dal.ts` (`verifySession`) and must be called
 * from every Server Action, Route Handler, and authed page — per the
 * Next.js 16 docs, proxy must not be the only line of defense.
 */

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('pw_session')?.value;
  const session = await decrypt(token);

  const isLoginRoute = pathname === '/login';

  if (!session && !isLoginRoute) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (session && isLoginRoute) {
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
