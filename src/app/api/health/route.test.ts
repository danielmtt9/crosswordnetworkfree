import { GET } from './route';

describe('/api/health', () => {
  it('returns 200 with ok/uptime/node', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(typeof data.uptime).toBe('number');
    expect(typeof data.node).toBe('string');
  });
});

