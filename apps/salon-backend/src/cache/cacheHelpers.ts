import { redis } from "./redis";

export async function getOrSetJSON<T>(
  key: string,
  ttlSec: number,
  getter: () => Promise<T>
): Promise<{ data: T; hit: boolean }> {
  const cached = await redis.get(key);

  if (cached) {
    try {
      return { data: JSON.parse(cached) as T, hit: true };
    } catch {
      await redis.del(key);
    }
  }

  const fresh = await getter();
  await redis.set(key, JSON.stringify(fresh), { EX: ttlSec });

  return { data: fresh, hit: false };
}

export async function delKey(key: string) {
  await redis.del(key);
}