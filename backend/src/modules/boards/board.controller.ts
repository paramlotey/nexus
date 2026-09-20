import type { NextFunction, Request, Response } from "express";

import * as boardService from "./board.service.js";
import { AppError } from "../../utils/app-error.js";
import { recordAuditLog } from "../audit/audit.service.js";

const getRequiredParam = (req: Request, paramName: string): string => {
  const value = req.params[paramName];

  if (typeof value !== "string" || value.trim() === "") {
    throw new AppError(400, `Invalid ${paramName}`);
  }

  return value;
};

export const createBoard = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const workspaceId = getRequiredParam(req, "workspaceId");

    const projectId = getRequiredParam(req, "projectId");

    const board = await boardService.createBoard({
      workspaceId,
      projectId,
      name: req.body.name,
      description: req.body.description,
      userId: req.user.userId,
    });

    await recordAuditLog({
      workspaceId,
      actorId: req.user.userId,
      action: "BOARD_CREATED",
      entityType: "BOARD",
      entityId: board._id.toString(),
      metadata: { projectId, name: board.name },
    });

    res.status(201).json({
      success: true,
      data: board,
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectBoards = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const workspaceId = getRequiredParam(req, "workspaceId");

    const projectId = getRequiredParam(req, "projectId");

    const boards = await boardService.getProjectBoards(workspaceId, projectId);

    res.status(200).json({
      success: true,
      data: boards,
    });
  } catch (error) {
    next(error);
  }
};

export const getBoardById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const workspaceId = getRequiredParam(req, "workspaceId");

    const projectId = getRequiredParam(req, "projectId");

    const boardId = getRequiredParam(req, "boardId");

    const board = await boardService.getBoardById(
      workspaceId,
      projectId,
      boardId,
    );

    res.status(200).json({
      success: true,
      data: board,
    });
  } catch (error) {
    next(error);
  }
};

export const updateBoard = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const workspaceId = getRequiredParam(req, "workspaceId");

    const projectId = getRequiredParam(req, "projectId");

    const boardId = getRequiredParam(req, "boardId");

    const board = await boardService.updateBoard({
      workspaceId,
      projectId,
      boardId,
      name: req.body.name,
      description: req.body.description,
    });

    await recordAuditLog({
      workspaceId,
      actorId: req.user.userId,
      action: "BOARD_UPDATED",
      entityType: "BOARD",
      entityId: board._id.toString(),
      metadata: { projectId, changedFields: Object.keys(req.body) },
    });

    res.status(200).json({
      success: true,
      data: board,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteBoard = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const workspaceId = getRequiredParam(req, "workspaceId");

    const projectId = getRequiredParam(req, "projectId");

    const boardId = getRequiredParam(req, "boardId");

    await boardService.deleteBoard(workspaceId, projectId, boardId);

    await recordAuditLog({
      workspaceId,
      actorId: req.user.userId,
      action: "BOARD_DELETED",
      entityType: "BOARD",
      entityId: boardId,
      metadata: { projectId },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
