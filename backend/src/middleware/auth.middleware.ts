import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/app-error.js";
import { verifyAccessToken } from "../utils/jwt.js";

export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    next(new AppError(401, "Authentication required"));
    return;
  }

  const token = authorization.split(" ")[1];

  if (!token) {
    next(new AppError(401, "Authentication required"));
    return;
  }

  try {
    const decoded = verifyAccessToken(token);

    req.user = {
      userId: decoded.userId,
    };

    next();
  } catch {
    next(new AppError(401, "Invalid or expired access token"));
  }
};
