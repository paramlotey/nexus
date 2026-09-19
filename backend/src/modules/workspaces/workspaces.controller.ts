import type { NextFunction, Request, Response } from "express";

import * as workspaceService from "./workspace.service.js";
import { AppError } from "../../utils/app-error.js";

export const createWorkspace = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const workspace = await workspaceService.createWorkspace({
      name: req.body.name,
      userId: req.user.userId,
    });

    res.status(201).json({
      success: true,
      data: workspace,
    });
  } catch (error) {
    next(error);
  }
};
