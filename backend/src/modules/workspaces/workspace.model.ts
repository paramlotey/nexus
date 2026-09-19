import { Schema, model, type Document, type Types } from "mongoose";

export interface IWorkspace extends Document {
  name: string;
  slug: string;
  createdBy: Types.ObjectId;
}

const workspaceSchema = new Schema<IWorkspace>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

export const Workspace = model<IWorkspace>("Workspace", workspaceSchema);
