import type { NextFunction, Request, Response } from "express";

import * as taskService from "./task.service.js";
import { AppError } from "../../utils/app-error.js";
import { recordAuditLog } from "../audit/audit.service.js";
import { publishNotification } from "../../jobs/publishers/notification.publisher.js";

const getRequiredParam = (req: Request, paramName: string): string => {
  const value = req.params[paramName];

  if (typeof value !== "string" || value.trim() === "") {
    throw new AppError(400, `Invalid ${paramName}`);
  }

  return value;
};

const getContext = (req: Request) => ({
  workspaceId: getRequiredParam(req, "workspaceId"),

  projectId: getRequiredParam(req, "projectId"),

  boardId: getRequiredParam(req, "boardId"),
});

export const createTask = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const context = getContext(req);

    const task = await taskService.createTask({
      ...context,

      columnId: req.body.columnId,
      title: req.body.title,
      description: req.body.description,
      priority: req.body.priority,
      assigneeIds: req.body.assigneeIds,
      dueDate: req.body.dueDate,

      userId: req.user.userId,
    });

    await recordAuditLog({
      workspaceId: context.workspaceId,
      actorId: req.user.userId,
      action: "TASK_CREATED",
      entityType: "TASK",
      entityId: task._id.toString(),
      metadata: {
        projectId: context.projectId,
        boardId: context.boardId,
        columnId: task.columnId.toString(),
        title: task.title,
      },
    });

    if (task.assigneeIds.length > 0) {
      await publishNotification({
        workspaceId: context.workspaceId,
        recipientIds: task.assigneeIds.map((id) => id.toString()),
        actorId: req.user.userId,
        type: "TASK_ASSIGNED",
        title: "New task assigned",
        message: `You were assigned to "${task.title}"`,
        entityType: "TASK",
        entityId: task._id.toString(),
        metadata: {
          projectId: context.projectId,
          boardId: context.boardId,
          columnId: task.columnId.toString(),
        },
      });
    }

    res.status(201).json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

export const getBoardTasks = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const tasks = await taskService.getBoardTasks(getContext(req));

    res.status(200).json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

export const getTaskById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const task = await taskService.getTaskById(
      getContext(req),
      getRequiredParam(req, "taskId"),
    );

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const context = getContext(req);

    const task = await taskService.updateTask({
      ...context,

      taskId: getRequiredParam(req, "taskId"),

      title: req.body.title,
      description: req.body.description,
      priority: req.body.priority,
      assigneeIds: req.body.assigneeIds,
      dueDate: req.body.dueDate,
    });

    await recordAuditLog({
      workspaceId: context.workspaceId,
      actorId: req.user.userId,
      action: "TASK_UPDATED",
      entityType: "TASK",
      entityId: task._id.toString(),
      metadata: {
        projectId: context.projectId,
        boardId: context.boardId,
        changedFields: Object.keys(req.body),
      },
    });

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

export const moveTask = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const context = getContext(req);

    const task = await taskService.moveTask(
      context,

      getRequiredParam(req, "taskId"),

      req.body.targetColumnId,
      req.body.position,
    );

    await recordAuditLog({
      workspaceId: context.workspaceId,
      actorId: req.user.userId,
      action: "TASK_MOVED",
      entityType: "TASK",
      entityId: task._id.toString(),
      metadata: {
        projectId: context.projectId,
        boardId: context.boardId,
        targetColumnId: req.body.targetColumnId,
        position: req.body.position,
      },
    });

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const context = getContext(req);
    const taskId = getRequiredParam(req, "taskId");

    await taskService.deleteTask(
      context,
      taskId,
    );

    await recordAuditLog({
      workspaceId: context.workspaceId,
      actorId: req.user.userId,
      action: "TASK_DELETED",
      entityType: "TASK",
      entityId: taskId,
      metadata: {
        projectId: context.projectId,
        boardId: context.boardId,
      },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
