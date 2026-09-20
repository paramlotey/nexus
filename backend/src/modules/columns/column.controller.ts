import type { NextFunction, Request, Response } from "express";

import * as columnService from "./column.service.js";
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

export const createColumn = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const column = await columnService.createColumn({
      ...getContext(req),
      name: req.body.name,
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
    const column = await columnService.updateColumn({
      ...getContext(req),
      columnId: getRequiredParam(req, "columnId"),
      name: req.body.name,
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
    const columns = await columnService.reorderColumns(
      getContext(req),
      req.body.columnIds,
    );

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
    await columnService.deleteColumn(
      getContext(req),
      getRequiredParam(req, "columnId"),
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
