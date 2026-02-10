export const runtime = 'nodejs';

export async function GET() {
  return Response.json(
    {
      ok: true,
      uptime: process.uptime(),
      node: process.version,
    },
    {
      headers: {
        // Never cache health checks.
        'Cache-Control': 'no-store',
      },
    },
  );
}

