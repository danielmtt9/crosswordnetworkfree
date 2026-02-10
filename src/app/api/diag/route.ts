import { NextResponse } from 'next/server';

function getBearerToken(req: Request): string | null {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!auth) return null;
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

export async function GET(req: Request) {
  // If not configured, don't expose anything (even an auth challenge).
  const expected = process.env.DIAGNOSTICS_TOKEN;
  if (!expected) {
    return new NextResponse(null, { status: 404 });
  }

  const provided = getBearerToken(req);
  if (!provided || provided !== expected) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const envPresent = {
    NODE_ENV: !!process.env.NODE_ENV,
    PORT: !!process.env.PORT,
    NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    DATABASE_URL: !!process.env.DATABASE_URL,
    GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    RESEND_API_KEY: !!process.env.RESEND_API_KEY,
    EMAIL_FROM: !!process.env.EMAIL_FROM,
  };

  return NextResponse.json({
    ok: true,
    node: process.version,
    nodeEnv: process.env.NODE_ENV || '(unset)',
    uptime: process.uptime(),
    pid: process.pid,
    cwd: process.cwd(),
    memory: process.memoryUsage(),
    envPresent,
  });
}

