import { Redis } from "ioredis";

import { env } from "./env.js";

let redisClient: Redis | null = null;
let redisErrorReported = false;

export const getRedisClient = (): Redis | null => {
  if (env.NODE_ENV === "test") {
    return null;
  }

  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      connectTimeout: 2000,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: (attempt) => Math.min(attempt * 500, 5000),
    });

    redisClient.on("error", (error) => {
      if (!redisErrorReported) {
        console.error("Redis error:", error.message);
        redisErrorReported = true;
      }
    });

    redisClient.on("connect", () => {
      redisErrorReported = false;
      console.log("Redis connected");
    });
  }

  return redisClient;
};

export const connectRedis = async (): Promise<void> => {
  const client = getRedisClient();

  if (!client) {
    return;
  }

  if (client.status === "wait") {
    try {
      await client.connect();
    } catch (error) {
      console.error(
        "Redis connection failed. Continuing without cache.",
        error,
      );
    }
  }
};

export const disconnectRedis = async (): Promise<void> => {
  if (!redisClient) {
    return;
  }

  try {
    await redisClient.quit();
  } catch {
    redisClient.disconnect();
  }

  redisClient = null;
  redisErrorReported = false;
};
