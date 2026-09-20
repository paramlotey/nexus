import mongoose from "mongoose";

import { Notification } from "../../modules/notifications/notification.model.js";
import { emitNotificationToUser } from "../../sockets/socket.emitter.js";
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

  let createdCount = 0;

  for (const userId of recipients) {
    const dedupeKey = `${data.eventId}:${userId}`;
    const result = await Notification.updateOne(
      { dedupeKey },
      {
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
          dedupeKey,
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );

    if (!result.upsertedId) {
      continue;
    }

    const notification = await Notification.findById(result.upsertedId).lean();

    if (!notification) {
      continue;
    }

    createdCount += 1;
    emitNotificationToUser(userId, notification);
  }

  return createdCount;
};
