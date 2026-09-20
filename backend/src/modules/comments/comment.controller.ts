import type { NextFunction, Request, Response } from "express";

import * as commentService from "./comment.service.js";
import { AppError } from "../../utils/app-error.js";
import { recordAuditLog } from "../audit/audit.service.js";

const getRequiredParam = (req: Request, paramName: string): string => {
  const value = req.params[paramName];

  if (typeof value !== "string" || value.trim() === "") {
    throw new AppError(400, `Invalid ${paramName}`);
  }

  return value;
};

const getContext = (req: Request): commentService.CommentContext => ({
  workspaceId: getRequiredParam(req, "workspaceId"),

  projectId: getRequiredParam(req, "projectId"),

  boardId: getRequiredParam(req, "boardId"),

  taskId: getRequiredParam(req, "taskId"),
});

export const createComment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const context = getContext(req);

    const comment = await commentService.createComment(
      context,
      req.user.userId,
      req.body.content,
    );

    await recordAuditLog({
      workspaceId: context.workspaceId,
      actorId: req.user.userId,
      action: "COMMENT_CREATED",
      entityType: "COMMENT",
      entityId: comment._id.toString(),
      metadata: {
        projectId: context.projectId,
        boardId: context.boardId,
        taskId: context.taskId,
      },
    });

    res.status(201).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    next(error);
  }
};

export const getTaskComments = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const comments = await commentService.getTaskComments(getContext(req));

    res.status(200).json({
      success: true,
      data: comments,
    });
  } catch (error) {
    next(error);
  }
};

export const updateComment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const context = getContext(req);

    const comment = await commentService.updateComment(
      context,

      getRequiredParam(req, "commentId"),

      req.user.userId,

      req.body.content,
    );

    await recordAuditLog({
      workspaceId: context.workspaceId,
      actorId: req.user.userId,
      action: "COMMENT_UPDATED",
      entityType: "COMMENT",
      entityId: comment._id.toString(),
      metadata: {
        projectId: context.projectId,
        boardId: context.boardId,
        taskId: context.taskId,
        changedFields: ["content"],
      },
    });

    res.status(200).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteComment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user || !req.workspaceMember) {
      throw new AppError(401, "Authentication required");
    }

    const context = getContext(req);
    const commentId = getRequiredParam(req, "commentId");

    await commentService.deleteComment(
      context,

      commentId,

      req.user.userId,

      req.workspaceMember.role,
    );

    await recordAuditLog({
      workspaceId: context.workspaceId,
      actorId: req.user.userId,
      action: "COMMENT_DELETED",
      entityType: "COMMENT",
      entityId: commentId,
      metadata: {
        projectId: context.projectId,
        boardId: context.boardId,
        taskId: context.taskId,
      },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
