import type { Server, Socket } from "socket.io";

import type {
  NotificationEntityType,
  NotificationType,
} from "../modules/notifications/notification.model.js";

export interface RealtimeNotification {
  _id: string;
  workspaceId: string;
  userId: string;
  actorId?: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType: NotificationEntityType;
  entityId: string;
  metadata: Record<string, unknown>;
  readAt?: string;
  createdAt: string;
}

export interface WorkspaceRoomPayload {
  workspaceId: string;
}

export interface WorkspaceRoomResponse {
  success: boolean;
  error?: string;
}

export interface ServerToClientEvents {
  "notification:new": (notification: RealtimeNotification) => void;
  "workspace:joined": (payload: WorkspaceRoomPayload) => void;
  "workspace:left": (payload: WorkspaceRoomPayload) => void;
}

export interface ClientToServerEvents {
  "workspace:join": (
    payload: WorkspaceRoomPayload,
    callback: (response: WorkspaceRoomResponse) => void,
  ) => void;
  "workspace:leave": (
    payload: WorkspaceRoomPayload,
    callback: (response: WorkspaceRoomResponse) => void,
  ) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  userId: string;
}

export type NexusSocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export type NexusSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
