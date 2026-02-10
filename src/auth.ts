import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const nextAuthSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

// NextAuth v5 prefers AUTH_URL/AUTH_SECRET; keep NEXTAUTH_* for compatibility.
const authUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;

if (!nextAuthSecret) {
  // Without a stable secret, JWT session strategy will break and NextAuth will show a generic
  // "server configuration" error. Log loudly so host logs explain the issue.
  console.error('[auth] Missing NEXTAUTH_SECRET');
}

if (!googleClientId || !googleClientSecret) {
  console.error('[auth] Missing Google OAuth env vars', {
    hasClientId: !!googleClientId,
    hasClientSecret: !!googleClientSecret,
  });
}

const providers = [
  ...(googleClientId && googleClientSecret
    ? [
        Google({
          clientId: googleClientId,
          clientSecret: googleClientSecret,
        }),
      ]
    : []),
  Credentials({
    name: 'credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        return null;
      }

      const user = await prisma.user.findUnique({
        where: {
          email: credentials.email as string,
        },
      });

      if (!user || !user.password) {
        return null;
      }

      const isPasswordValid = await bcrypt.compare(
        credentials.password as string,
        user.password,
      );

      if (!isPasswordValid) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      };
    },
  }),
];

const config = {
  // Hostinger/Passenger-style proxies often require trustHost to avoid "UntrustedHost" failures.
  trustHost: true,
  ...(nextAuthSecret ? { secret: nextAuthSecret } : {}),
  ...(authUrl ? { url: authUrl } : {}),
  adapter: PrismaAdapter(prisma),
  providers,
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async signIn({ user }) {
      try {
        const email = user?.email?.toLowerCase();
        if (email && email.endsWith('@crossword.network')) {
          await prisma.user.update({
            where: { id: user.id },
            data: { role: 'ADMIN' },
          });
          user.role = 'ADMIN';
        }
        return true;
      } catch (error) {
        console.error('Error enforcing admin role for crossword.network:', error);
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub;
        session.user.role = token.role;
        (session as any).role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: '/signin',
  },
  // When debugging on shared hosts (Hostinger), env/config problems can be hard to see.
  // Enable by setting NEXTAUTH_DEBUG=true or AUTH_DEBUG=true.
  debug: process.env.NEXTAUTH_DEBUG === 'true' || process.env.AUTH_DEBUG === 'true',
  logger: {
    error(code, metadata) {
      // Avoid logging secrets; NextAuth metadata is typically safe, but keep it short.
      console.error('[auth:error]', code, {
        name: (metadata as any)?.name,
        message: (metadata as any)?.message,
        cause: (metadata as any)?.cause,
      });
    },
    warn(code) {
      console.warn('[auth:warn]', code);
    },
    debug(code, metadata) {
      console.debug('[auth:debug]', code, metadata);
    },
  },
} as const;

export const { handlers, auth, signIn, signOut } = NextAuth(config);
