type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

// Simple per-process in-memory TTL cache.
// Suitable for shared hosting to reduce DB/FS work. Not a replacement for Redis.
const cache = new Map<string, CacheEntry<any>>();

export function cacheKeyFromRequest(req: { url: string }): string {
  return req.url;
}

export async function withTtlCache<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<{ value: T; hit: boolean }> {
  const now = Date.now();
  const existing = cache.get(key) as CacheEntry<T> | undefined;
  if (existing && existing.expiresAt > now) {
    return { value: existing.value, hit: true };
  }

  const value = await fn();
  cache.set(key, { value, expiresAt: now + ttlMs });
  return { value, hit: false };
}

