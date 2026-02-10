import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Keep middleware lightweight: do not import full NextAuth config/Prisma here.
// Middleware only checks for the presence of a valid session token.
export async function middleware(req: NextRequest) {
  let token: unknown = null;
  try {
    token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
  } catch {
    token = null;
  }

  if (token) {
    return NextResponse.next();
  }

  const signInUrl = req.nextUrl.clone();
  signInUrl.pathname = '/signin';
  signInUrl.searchParams.set(
    'callbackUrl',
    `${req.nextUrl.pathname}${req.nextUrl.search}`,
  );
  return NextResponse.redirect(signInUrl);
}

export const config = {
  // Only protect authenticated areas. Everything else is public (including /puzzles/* and legal pages).
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/settings/:path*',
    '/profile/:path*',
    '/achievements/:path*',
    '/force-password-change/:path*',
  ],
};
