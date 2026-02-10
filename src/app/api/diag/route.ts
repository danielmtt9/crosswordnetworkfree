import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

function isPresent(value: string | undefined) {
  return !!value && value.trim().length > 0;
}

function getAuthBearer(req: Request) {
  const header = req.headers.get('authorization') || '';
  const m = header.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

export async function GET(req: Request) {
  const token = process.env.DIAGNOSTICS_TOKEN;
  if (!token) {
    return Response.json(
      { ok: false, error: 'DIAGNOSTICS_TOKEN not set' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const bearer = getAuthBearer(req);
  if (bearer !== token) {
    return Response.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const url = new URL(req.url);
  const doDb = url.searchParams.get('db') === '1';

  let db: { ok: boolean; error?: string } | undefined;
  if (doDb) {
    try {
      // Minimal connectivity check; does not reveal any data.
      await prisma.$queryRaw`SELECT 1`;
      db = { ok: true };
    } catch (e: any) {
      db = { ok: false, error: e?.message || String(e) };
    }
  }

  return Response.json(
    {
      ok: true,
      node: process.version,
      env: process.env.NODE_ENV,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cwd: process.cwd(),
      envPresent: {
        AUTH_URL: isPresent(process.env.AUTH_URL),
        NEXTAUTH_URL: isPresent(process.env.NEXTAUTH_URL),
        AUTH_SECRET: isPresent(process.env.AUTH_SECRET),
        NEXTAUTH_SECRET: isPresent(process.env.NEXTAUTH_SECRET),
        DATABASE_URL: isPresent(process.env.DATABASE_URL),
        GOOGLE_CLIENT_ID: isPresent(process.env.GOOGLE_CLIENT_ID),
        GOOGLE_CLIENT_SECRET: isPresent(process.env.GOOGLE_CLIENT_SECRET),
        RESEND_API_KEY: isPresent(process.env.RESEND_API_KEY),
      },
      ...(db ? { db } : {}),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}

