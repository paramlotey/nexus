import { Worker } from "bullmq";
import { Redis } from "ioredis";

import { env } from "../../config/env.js";
import { processNotificationJob } from "../processors/notification.processor.js";
import { NOTIFICATION_QUEUE_NAME } from "../queues/notification.queue.js";
import type { NotificationJobData } from "../types/notification-job.types.js";

let workerConnection: Redis | null = null;
let notificationWorker: Worker<NotificationJobData> | null = null;

export const startNotificationWorker = (): Worker<NotificationJobData> | null => {
  if (env.NODE_ENV === "test") {
    return null;
  }

  if (notificationWorker) {
    return notificationWorker;
  }

  workerConnection = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
  });

  notificationWorker = new Worker<NotificationJobData>(
    NOTIFICATION_QUEUE_NAME,
    async (job) => {
      await processNotificationJob(job.data);
    },
    { connection: workerConnection, concurrency: 5 },
  );

  notificationWorker.on("completed", (job) => {
    console.log(`Notification job completed: ${job.id}`);
  });

  notificationWorker.on("failed", (job, error) => {
    console.error(`Notification job failed: ${job?.id ?? "unknown"}`, error);
  });

  notificationWorker.on("error", (error) => {
    console.error("Notification worker error:", error);
  });

  return notificationWorker;
};

export const stopNotificationWorker = async (): Promise<void> => {
  if (notificationWorker) {
    await notificationWorker.close();
    notificationWorker = null;
  }

  if (workerConnection) {
    try {
      await workerConnection.quit();
    } catch {
      workerConnection.disconnect();
    }

    workerConnection = null;
  }
};
