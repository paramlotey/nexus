import { Schema, model, type Types } from "mongoose";

export const NOTIFICATION_TYPES = [
  "TASK_ASSIGNED",
  "TASK_MOVED",
  "COMMENT_ADDED",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_ENTITY_TYPES = ["TASK", "COMMENT"] as const;

export type NotificationEntityType =
  (typeof NOTIFICATION_ENTITY_TYPES)[number];

export interface INotification {
  workspaceId: Types.ObjectId;
  userId: Types.ObjectId;
  actorId?: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  entityType: NotificationEntityType;
  entityId: Types.ObjectId;
  metadata: Record<string, unknown>;
  dedupeKey: string;
  readAt?: Date;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    entityType: {
      type: String,
      enum: NOTIFICATION_ENTITY_TYPES,
      required: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: () => ({}),
    },
    dedupeKey: {
      type: String,
      required: true,
      unique: true,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  },
);

notificationSchema.index({ workspaceId: 1, userId: 1, createdAt: -1 });
notificationSchema.index({
  workspaceId: 1,
  userId: 1,
  readAt: 1,
  createdAt: -1,
});

export const Notification = model<INotification>(
  "Notification",
  notificationSchema,
);
