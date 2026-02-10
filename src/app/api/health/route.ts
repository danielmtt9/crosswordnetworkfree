import { NextResponse } from 'next/server';

// Must not touch DB/Prisma. This route is used to confirm the server is alive even
// when external dependencies (DB, auth providers) are down.
export async function GET() {
  return NextResponse.json({
    ok: true,
    uptime: process.uptime(),
    node: process.version,
  });
}

