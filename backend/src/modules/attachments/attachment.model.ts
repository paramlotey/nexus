import { Schema, model, type Document, type Types } from "mongoose";

export interface IAttachment extends Document {
  workspaceId: Types.ObjectId;
  projectId: Types.ObjectId;
  boardId: Types.ObjectId;
  taskId: Types.ObjectId;
  uploadedBy: Types.ObjectId;
  originalName: string;
  storedName: string;
  storagePath: string;
  mimeType: string;
  size: number;
  createdAt: Date;
  updatedAt: Date;
}

const attachmentSchema = new Schema<IAttachment>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },

    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    boardId: {
      type: Schema.Types.ObjectId,
      ref: "Board",
      required: true,
      index: true,
    },

    taskId: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },

    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    originalName: {
      type: String,
      required: true,
    },

    storedName: {
      type: String,
      required: true,
      unique: true,
    },

    storagePath: {
      type: String,
      required: true,
    },

    mimeType: {
      type: String,
      required: true,
    },

    size: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

attachmentSchema.index({
  workspaceId: 1,
  projectId: 1,
  boardId: 1,
  taskId: 1,
  createdAt: -1,
});

export const Attachment = model<IAttachment>("Attachment", attachmentSchema);
