import type { NextFunction, Request, Response } from "express";

import * as taskService from "./task.service.js";
import { AppError } from "../../utils/app-error.js";

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

    const task = await taskService.createTask({
      ...getContext(req),

      columnId: req.body.columnId,
      title: req.body.title,
      description: req.body.description,
      priority: req.body.priority,
      assigneeIds: req.body.assigneeIds,
      dueDate: req.body.dueDate,

      userId: req.user.userId,
    });

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
    const task = await taskService.updateTask({
      ...getContext(req),

      taskId: getRequiredParam(req, "taskId"),

      title: req.body.title,
      description: req.body.description,
      priority: req.body.priority,
      assigneeIds: req.body.assigneeIds,
      dueDate: req.body.dueDate,
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
    const task = await taskService.moveTask(
      getContext(req),

      getRequiredParam(req, "taskId"),

      req.body.targetColumnId,
      req.body.position,
    );

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
    await taskService.deleteTask(
      getContext(req),
      getRequiredParam(req, "taskId"),
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
