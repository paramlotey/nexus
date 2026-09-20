import { randomUUID } from "node:crypto";

import { env } from "../../config/env.js";
import { processNotificationJob } from "../processors/notification.processor.js";
import { getNotificationQueue } from "../queues/notification.queue.js";
import type { NotificationJobData } from "../types/notification-job.types.js";

type PublishInput = Omit<NotificationJobData, "eventId">;

export const publishNotification = async (
  input: PublishInput,
): Promise<void> => {
  const data: NotificationJobData = { ...input, eventId: randomUUID() };

  if (env.NODE_ENV === "test") {
    await processNotificationJob(data);
    return;
  }

  try {
    await getNotificationQueue().add(data.type, data, { jobId: data.eventId });
  } catch (error) {
    console.error("Failed to enqueue notification", error);
  }
};
