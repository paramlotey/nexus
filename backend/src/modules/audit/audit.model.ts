import { Schema, model, type Types } from "mongoose";

export const AUDIT_ACTIONS = [
  "WORKSPACE_CREATED",
  "MEMBER_ADDED",
  "MEMBER_ROLE_UPDATED",
  "MEMBER_REMOVED",

  "PROJECT_CREATED",
  "PROJECT_UPDATED",
  "PROJECT_DELETED",

  "BOARD_CREATED",
  "BOARD_UPDATED",
  "BOARD_DELETED",

  "COLUMN_CREATED",
  "COLUMN_UPDATED",
  "COLUMN_REORDERED",
  "COLUMN_DELETED",

  "TASK_CREATED",
  "TASK_UPDATED",
  "TASK_MOVED",
  "TASK_DELETED",

  "COMMENT_CREATED",
  "COMMENT_UPDATED",
  "COMMENT_DELETED",

  "ATTACHMENT_UPLOADED",
  "ATTACHMENT_DELETED",

  "DOCUMENT_CREATED",
  "DOCUMENT_UPDATED",
  "DOCUMENT_DELETED",
] as const;

export const AUDIT_ENTITY_TYPES = [
  "WORKSPACE",
  "MEMBER",
  "PROJECT",
  "BOARD",
  "COLUMN",
  "TASK",
  "COMMENT",
  "ATTACHMENT",
  "DOCUMENT",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

export interface IAuditLog {
  workspaceId: Types.ObjectId;
  actorId: Types.ObjectId;

  action: AuditAction;
  entityType: AuditEntityType;

  entityId?: Types.ObjectId;

  metadata: Record<string, unknown>;

  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },

    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    action: {
      type: String,
      enum: AUDIT_ACTIONS,
      required: true,
    },

    entityType: {
      type: String,
      enum: AUDIT_ENTITY_TYPES,
      required: true,
    },

    entityId: {
      type: Schema.Types.ObjectId,
    },

    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  },
);

auditLogSchema.index({
  workspaceId: 1,
  createdAt: -1,
});

auditLogSchema.index({
  workspaceId: 1,
  action: 1,
  createdAt: -1,
});

auditLogSchema.index({
  workspaceId: 1,
  entityType: 1,
  entityId: 1,
  createdAt: -1,
});

export const AuditLog = model<IAuditLog>("AuditLog", auditLogSchema);
