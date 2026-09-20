import jwt, { type SignOptions } from "jsonwebtoken";

import { env } from "../config/env.js";

export interface TokenPayload {
  userId: string;
}

export const verifyAccessToken = (token: string): TokenPayload => {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);

  if (
    typeof decoded !== "object" ||
    decoded === null ||
    !("userId" in decoded) ||
    typeof decoded.userId !== "string"
  ) {
    throw new Error("Invalid access token payload");
  }

  return { userId: decoded.userId };
};

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(
    payload,
    process.env.JWT_ACCESS_SECRET as string,
    {
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
    } as SignOptions,
  );
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET as string,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
    } as SignOptions,
  );
};
