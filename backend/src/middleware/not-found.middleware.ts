import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/app-error.js";

export const notFound = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};
