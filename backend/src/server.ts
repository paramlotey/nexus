import app from "./app.js";
import mongoose from "mongoose";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { connectRedis, disconnectRedis } from "./config/redis.js";
import {
  startNotificationWorker,
  stopNotificationWorker,
} from "./jobs/workers/notification.worker.js";
import { closeNotificationQueue } from "./jobs/queues/notification.queue.js";

let httpServer: ReturnType<typeof app.listen> | null = null;
let shuttingDown = false;

const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();
    await connectRedis();
    startNotificationWorker();

    httpServer = app.listen(env.PORT, () => {
      console.log(`WorkSpace API running on port ${env.PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

const shutdown = async (signal: string): Promise<void> => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received. Shutting down gracefully.`);

  try {
    if (httpServer) {
      await new Promise<void>((resolve, reject) => {
        httpServer?.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
      httpServer = null;
    }

    await stopNotificationWorker();
    await closeNotificationQueue();
    await disconnectRedis();

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  } catch (error) {
    console.error("Graceful shutdown failed:", error);
    process.exitCode = 1;
  }
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

void startServer();
