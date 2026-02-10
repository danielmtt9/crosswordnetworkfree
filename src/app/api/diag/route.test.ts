import { GET } from './route';

describe('/api/diag', () => {
  const oldEnv = process.env;

  beforeEach(() => {
    process.env = { ...oldEnv };
  });

  afterAll(() => {
    process.env = oldEnv;
  });

  it('returns 404 when DIAGNOSTICS_TOKEN is not set', async () => {
    delete process.env.DIAGNOSTICS_TOKEN;
    const req = new Request('http://localhost:3000/api/diag');
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it('returns 401 when token is set but missing/invalid', async () => {
    process.env.DIAGNOSTICS_TOKEN = 'secret';

    const req1 = new Request('http://localhost:3000/api/diag');
    const res1 = await GET(req1);
    expect(res1.status).toBe(401);

    const req2 = new Request('http://localhost:3000/api/diag', {
      headers: { Authorization: 'Bearer wrong' },
    });
    const res2 = await GET(req2);
    expect(res2.status).toBe(401);
  });

  it('returns diagnostics when token matches', async () => {
    process.env.DIAGNOSTICS_TOKEN = 'secret';
    process.env.NEXTAUTH_SECRET = 'x';
    process.env.DATABASE_URL = 'mysql://user:pass@host:3306/db';

    const req = new Request('http://localhost:3000/api/diag', {
      headers: { authorization: 'Bearer secret' },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(typeof data.node).toBe('string');
    expect(typeof data.uptime).toBe('number');
    expect(data.envPresent).toBeTruthy();
    expect(data.envPresent.NEXTAUTH_SECRET).toBe(true);
    expect(data.envPresent.DATABASE_URL).toBe(true);
  });
});

