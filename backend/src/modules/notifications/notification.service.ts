import mongoose from "mongoose";

import { Notification } from "./notification.model.js";
import { AppError } from "../../utils/app-error.js";

interface GetNotificationsInput {
  workspaceId: string;
  userId: string;
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

const validateObjectId = (value: string, field: string): void => {
  if (!mongoose.isValidObjectId(value)) {
    throw new AppError(400, `Invalid ${field}`);
  }
};

export const getUserNotifications = async ({
  workspaceId,
  userId,
  page = 1,
  limit = 20,
  unreadOnly = false,
}: GetNotificationsInput) => {
  validateObjectId(workspaceId, "workspaceId");
  validateObjectId(userId, "userId");

  const filter: Record<string, unknown> = { workspaceId, userId };

  if (unreadOnly) {
    filter.readAt = { $exists: false };
  }

  const skip = (page - 1) * limit;
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("actorId", "name email")
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({
      workspaceId,
      userId,
      readAt: { $exists: false },
    }),
  ]);

  return {
    notifications,
    unreadCount,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const markNotificationRead = async (
  workspaceId: string,
  userId: string,
  notificationId: string,
) => {
  validateObjectId(workspaceId, "workspaceId");
  validateObjectId(userId, "userId");
  validateObjectId(notificationId, "notificationId");

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, workspaceId, userId },
    { $set: { readAt: new Date() } },
    { returnDocument: "after" },
  ).lean();

  if (!notification) {
    throw new AppError(404, "Notification not found");
  }

  return notification;
};

export const markAllNotificationsRead = async (
  workspaceId: string,
  userId: string,
): Promise<number> => {
  validateObjectId(workspaceId, "workspaceId");
  validateObjectId(userId, "userId");

  const result = await Notification.updateMany(
    { workspaceId, userId, readAt: { $exists: false } },
    { $set: { readAt: new Date() } },
  );

  return result.modifiedCount;
};
