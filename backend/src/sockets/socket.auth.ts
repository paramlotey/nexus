import type { ExtendedError } from "socket.io";

import type { NexusSocket } from "./socket.types.js";
import { verifyAccessToken } from "../utils/jwt.js";

const getSocketToken = (socket: NexusSocket): string | null => {
  const authToken = socket.handshake.auth?.token;

  if (typeof authToken === "string" && authToken.trim() !== "") {
    return authToken;
  }

  const authorization = socket.handshake.headers.authorization;

  if (
    typeof authorization === "string" &&
    authorization.startsWith("Bearer ")
  ) {
    return authorization.slice(7);
  }

  return null;
};

export const authenticateSocket = (
  socket: NexusSocket,
  next: (error?: ExtendedError) => void,
): void => {
  const token = getSocketToken(socket);

  if (!token) {
    next(new Error("Authentication required"));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    socket.data.userId = payload.userId;
    next();
  } catch {
    next(new Error("Invalid or expired access token"));
  }
};
