import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";
import type { TokenPayload } from "../utils/jwt.js";

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

  const jwtSecret = env.JWT_ACCESS_SECRET;

  if (!jwtSecret) {
    next(new AppError(500, "JWT secret not configured"));
    return;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);

    if (
      typeof decoded !== "object" ||
      decoded === null ||
      !("userId" in decoded) ||
      typeof decoded.userId !== "string"
    ) {
      next(new AppError(401, "Invalid or expired access token"));
      return;
    }

    req.user = {
      userId: decoded.userId as TokenPayload["userId"],
    };

    next();
  } catch {
    next(new AppError(401, "Invalid or expired access token"));
  }
};
