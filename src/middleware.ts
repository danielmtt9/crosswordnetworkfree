import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Keep middleware Edge-safe: do not import NextAuth config, Prisma, or bcrypt here.
// Middleware only checks for the presence of a valid session token.
export async function middleware(req: NextRequest) {
  const isApiAuthRoute = req.nextUrl.pathname.startsWith('/api/auth');
  const isPublicRoute = ['/', '/waitlist', '/signin', '/signup'].includes(req.nextUrl.pathname);
  if (isApiAuthRoute || isPublicRoute) {
    return NextResponse.next();
  }

  let token: unknown = null;
  try {
    token = await getToken({
      req,
      secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    });
  } catch {
    token = null;
  }

  if (token) {
    return NextResponse.next();
  }

  const signInUrl = req.nextUrl.clone();
  signInUrl.pathname = '/signin';
  signInUrl.searchParams.set('callbackUrl', `${req.nextUrl.pathname}${req.nextUrl.search}`);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  // Allow static assets through without auth so puzzle iframes can load bridge scripts.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|scripts|puzzles).*)'],
};
