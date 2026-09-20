import { Schema, model, type Document, type Types } from "mongoose";

export interface IWorkspaceDocument extends Document {
  workspaceId: Types.ObjectId;
  projectId?: Types.ObjectId;
  title: string;
  content: string;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const workspaceDocumentSchema = new Schema<IWorkspaceDocument>(
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
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      default: "",
      maxlength: 100_000,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

workspaceDocumentSchema.index({ workspaceId: 1, updatedAt: -1 });
workspaceDocumentSchema.index({ workspaceId: 1, projectId: 1, updatedAt: -1 });
workspaceDocumentSchema.index(
  { workspaceId: 1, title: "text", content: "text" },
  {
    name: "document_workspace_text_search",
    weights: { title: 5, content: 1 },
  },
);

export const WorkspaceDocument = model<IWorkspaceDocument>(
  "WorkspaceDocument",
  workspaceDocumentSchema,
);
