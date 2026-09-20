import type { NextFunction, Request, Response } from "express";

import {
  getUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./notification.service.js";
import { AppError } from "../../utils/app-error.js";

const getRequiredParam = (req: Request, paramName: string): string => {
  const value = req.params[paramName];

  if (typeof value !== "string" || value.trim() === "") {
    throw new AppError(400, `Invalid ${paramName}`);
  }

  return value;
};

const getQueryString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

export const getNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const page = getQueryString(req.query.page);
    const limit = getQueryString(req.query.limit);
    const unreadOnly = getQueryString(req.query.unreadOnly);
    const result = await getUserNotifications({
      workspaceId: getRequiredParam(req, "workspaceId"),
      userId: req.user.userId,
      ...(page !== undefined && { page: Number(page) }),
      ...(limit !== undefined && { limit: Number(limit) }),
      unreadOnly: unreadOnly === "true",
    });

    res.status(200).json({
      success: true,
      data: result.notifications,
      unreadCount: result.unreadCount,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const markRead = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const notification = await markNotificationRead(
      getRequiredParam(req, "workspaceId"),
      req.user.userId,
      getRequiredParam(req, "notificationId"),
    );

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

export const markAllRead = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const modifiedCount = await markAllNotificationsRead(
      getRequiredParam(req, "workspaceId"),
      req.user.userId,
    );

    res.status(200).json({ success: true, data: { modifiedCount } });
  } catch (error) {
    next(error);
  }
};
