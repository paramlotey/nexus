import { Queue } from "bullmq";
import { Redis } from "ioredis";

import { env } from "../../config/env.js";
import type { NotificationJobData } from "../types/notification-job.types.js";

export const NOTIFICATION_QUEUE_NAME = "notifications";

let producerConnection: Redis | null = null;
let notificationQueue: Queue<NotificationJobData> | null = null;
let producerErrorReported = false;

const getProducerConnection = (): Redis => {
  if (!producerConnection) {
    producerConnection = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      enableOfflineQueue: false,
    });

    producerConnection.on("error", (error) => {
      if (!producerErrorReported) {
        console.error("Notification queue Redis error:", error.message);
        producerErrorReported = true;
      }
    });

    producerConnection.on("connect", () => {
      producerErrorReported = false;
    });
  }

  return producerConnection;
};

export const getNotificationQueue = (): Queue<NotificationJobData> => {
  if (!notificationQueue) {
    notificationQueue = new Queue<NotificationJobData>(
      NOTIFICATION_QUEUE_NAME,
      {
        connection: getProducerConnection(),
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: "exponential", delay: 1000 },
          removeOnComplete: { count: 1000 },
          removeOnFail: { count: 5000 },
        },
      },
    );
  }

  return notificationQueue;
};

export const closeNotificationQueue = async (): Promise<void> => {
  if (notificationQueue) {
    await notificationQueue.close();
    notificationQueue = null;
  }

  if (producerConnection) {
    try {
      await producerConnection.quit();
    } catch {
      producerConnection.disconnect();
    }

    producerConnection = null;
    producerErrorReported = false;
  }
};
