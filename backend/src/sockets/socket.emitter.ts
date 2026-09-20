import type { Types } from "mongoose";

import { getUserRoom } from "./socket.rooms.js";
import { getSocketServer } from "./socket.server.js";
import type { RealtimeNotification } from "./socket.types.js";
import type {
  NotificationEntityType,
  NotificationType,
} from "../modules/notifications/notification.model.js";

interface EmittableNotification {
  _id: Types.ObjectId | string;
  workspaceId: Types.ObjectId | string;
  userId: Types.ObjectId | string;
  actorId?: Types.ObjectId | string;
  type: NotificationType;
  title: string;
  message: string;
  entityType: NotificationEntityType;
  entityId: Types.ObjectId | string;
  metadata: Record<string, unknown>;
  readAt?: Date;
  createdAt: Date;
}

const toRealtimeNotification = (
  notification: EmittableNotification,
): RealtimeNotification => ({
  _id: notification._id.toString(),
  workspaceId: notification.workspaceId.toString(),
  userId: notification.userId.toString(),
  ...(notification.actorId && {
    actorId: notification.actorId.toString(),
  }),
  type: notification.type,
  title: notification.title,
  message: notification.message,
  entityType: notification.entityType,
  entityId: notification.entityId.toString(),
  metadata: notification.metadata,
  ...(notification.readAt && {
    readAt: notification.readAt.toISOString(),
  }),
  createdAt: notification.createdAt.toISOString(),
});

export const emitNotificationToUser = (
  userId: string,
  notification: EmittableNotification,
): void => {
  const io = getSocketServer();

  if (!io) {
    return;
  }

  io.to(getUserRoom(userId)).emit(
    "notification:new",
    toRealtimeNotification(notification),
  );
};
