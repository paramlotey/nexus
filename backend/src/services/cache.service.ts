import { getRedisClient } from "../config/redis.js";

export const getCachedJson = async <T>(key: string): Promise<T | null> => {
  const client = getRedisClient();

  if (!client || client.status !== "ready") {
    return null;
  }

  try {
    const value = await client.get(key);

    if (!value) {
      return null;
    }

    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`Cache read failed for ${key}`, error);
    return null;
  }
};

export const setCachedJson = async (
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> => {
  const client = getRedisClient();

  if (!client || client.status !== "ready") {
    return;
  }

  try {
    await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (error) {
    console.error(`Cache write failed for ${key}`, error);
  }
};

export const deleteCacheKeys = async (...keys: string[]): Promise<void> => {
  if (keys.length === 0) {
    return;
  }

  const client = getRedisClient();

  if (!client || client.status !== "ready") {
    return;
  }

  try {
    await client.del(...keys);
  } catch (error) {
    console.error("Cache invalidation failed", error);
  }
};
