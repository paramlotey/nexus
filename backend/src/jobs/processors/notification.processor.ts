import mongoose from "mongoose";

import { Notification } from "../../modules/notifications/notification.model.js";
import type { NotificationJobData } from "../types/notification-job.types.js";

export const processNotificationJob = async (
  data: NotificationJobData,
): Promise<number> => {
  const recipients = [...new Set(data.recipientIds)].filter(
    (userId) => userId !== data.actorId,
  );

  if (recipients.length === 0) {
    return 0;
  }

  await Notification.bulkWrite(
    recipients.map((userId) => ({
      updateOne: {
        filter: { dedupeKey: `${data.eventId}:${userId}` },
        update: {
          $setOnInsert: {
            workspaceId: new mongoose.Types.ObjectId(data.workspaceId),
            userId: new mongoose.Types.ObjectId(userId),
            ...(data.actorId && {
              actorId: new mongoose.Types.ObjectId(data.actorId),
            }),
            type: data.type,
            title: data.title,
            message: data.message,
            entityType: data.entityType,
            entityId: new mongoose.Types.ObjectId(data.entityId),
            metadata: data.metadata ?? {},
            dedupeKey: `${data.eventId}:${userId}`,
            createdAt: new Date(),
          },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  );

  return recipients.length;
};
