import type { NextFunction, Request, Response } from "express";

import * as columnService from "./column.service.js";
import { AppError } from "../../utils/app-error.js";
import { recordAuditLog } from "../audit/audit.service.js";

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

export const createColumn = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const context = getContext(req);

    const column = await columnService.createColumn({
      ...context,
      name: req.body.name,
    });

    await recordAuditLog({
      workspaceId: context.workspaceId,
      actorId: req.user.userId,
      action: "COLUMN_CREATED",
      entityType: "COLUMN",
      entityId: column._id.toString(),
      metadata: {
        projectId: context.projectId,
        boardId: context.boardId,
        name: column.name,
      },
    });

    res.status(201).json({
      success: true,
      data: column,
    });
  } catch (error) {
    next(error);
  }
};

export const getBoardColumns = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const columns = await columnService.getBoardColumns(getContext(req));

    res.status(200).json({
      success: true,
      data: columns,
    });
  } catch (error) {
    next(error);
  }
};

export const updateColumn = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const context = getContext(req);

    const column = await columnService.updateColumn({
      ...context,
      columnId: getRequiredParam(req, "columnId"),
      name: req.body.name,
    });

    await recordAuditLog({
      workspaceId: context.workspaceId,
      actorId: req.user.userId,
      action: "COLUMN_UPDATED",
      entityType: "COLUMN",
      entityId: column._id.toString(),
      metadata: {
        projectId: context.projectId,
        boardId: context.boardId,
        changedFields: ["name"],
      },
    });

    res.status(200).json({
      success: true,
      data: column,
    });
  } catch (error) {
    next(error);
  }
};

export const reorderColumns = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const context = getContext(req);

    const columns = await columnService.reorderColumns(
      context,
      req.body.columnIds,
    );

    await recordAuditLog({
      workspaceId: context.workspaceId,
      actorId: req.user.userId,
      action: "COLUMN_REORDERED",
      entityType: "COLUMN",
      metadata: {
        projectId: context.projectId,
        boardId: context.boardId,
        columnIds: req.body.columnIds,
      },
    });

    res.status(200).json({
      success: true,
      data: columns,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteColumn = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const context = getContext(req);
    const columnId = getRequiredParam(req, "columnId");

    await columnService.deleteColumn(
      context,
      columnId,
    );

    await recordAuditLog({
      workspaceId: context.workspaceId,
      actorId: req.user.userId,
      action: "COLUMN_DELETED",
      entityType: "COLUMN",
      entityId: columnId,
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
