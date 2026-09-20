import type { NextFunction, Request, Response } from "express";

import { searchWorkspace } from "./search.service.js";
import type { SearchEntityType } from "./search.validation.js";
import { AppError } from "../../utils/app-error.js";

const getRequiredParam = (req: Request, paramName: string): string => {
  const value = req.params[paramName];

  if (typeof value !== "string" || value.trim() === "") {
    throw new AppError(400, `Invalid ${paramName}`);
  }

  return value;
};

const getQueryString = (value: unknown): string | undefined => {
  return typeof value === "string" ? value : undefined;
};

export const searchWorkspaceController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const query = getQueryString(req.query.q)?.trim();

    if (!query) {
      throw new AppError(400, "Search query is required");
    }

    const type = getQueryString(req.query.type) as SearchEntityType | undefined;
    const limitValue = getQueryString(req.query.limit);

    const result = await searchWorkspace({
      workspaceId: getRequiredParam(req, "workspaceId"),
      query,
      ...(type !== undefined ? { type } : {}),
      ...(limitValue !== undefined ? { limit: Number(limitValue) } : {}),
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
