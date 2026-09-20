import { type Server as HttpServer } from "node:http";
import mongoose from "mongoose";
import { Server } from "socket.io";

import { authenticateSocket } from "./socket.auth.js";
import { getUserRoom, getWorkspaceRoom } from "./socket.rooms.js";
import type {
  NexusSocketServer,
  WorkspaceRoomResponse,
} from "./socket.types.js";
import { env } from "../config/env.js";
import { WorkspaceMember } from "../modules/workspaces/workspace-member.model.js";

let io: NexusSocketServer | null = null;

const invalidWorkspaceResponse = (): WorkspaceRoomResponse => ({
  success: false,
  error: "Invalid workspaceId",
});

export const initializeSocketServer = (
  httpServer: HttpServer,
): NexusSocketServer => {
  if (io) {
    return io;
  }

  io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    },
  });

  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    const userId = socket.data.userId;

    void socket.join(getUserRoom(userId));

    socket.on("workspace:join", async (payload, callback) => {
      if (typeof callback !== "function") {
        return;
      }

      const workspaceId = payload?.workspaceId;

      if (
        typeof workspaceId !== "string" ||
        !mongoose.isValidObjectId(workspaceId)
      ) {
        callback(invalidWorkspaceResponse());
        return;
      }

      try {
        const membership = await WorkspaceMember.exists({
          workspaceId,
          userId,
        });

        if (!membership) {
          callback({ success: false, error: "Workspace access denied" });
          return;
        }

        await socket.join(getWorkspaceRoom(workspaceId));
        socket.emit("workspace:joined", { workspaceId });
        callback({ success: true });
      } catch {
        callback({ success: false, error: "Unable to join workspace" });
      }
    });

    socket.on("workspace:leave", async (payload, callback) => {
      if (typeof callback !== "function") {
        return;
      }

      const workspaceId = payload?.workspaceId;

      if (
        typeof workspaceId !== "string" ||
        !mongoose.isValidObjectId(workspaceId)
      ) {
        callback(invalidWorkspaceResponse());
        return;
      }

      await socket.leave(getWorkspaceRoom(workspaceId));
      socket.emit("workspace:left", { workspaceId });
      callback({ success: true });
    });
  });

  return io;
};

export const getSocketServer = (): NexusSocketServer | null => io;

export const closeSocketServer = async (): Promise<void> => {
  if (!io) {
    return;
  }

  const currentIo = io;
  io = null;

  await new Promise<void>((resolve) => {
    currentIo.close(() => resolve());
  });
};
