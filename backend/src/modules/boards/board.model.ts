import { Schema, model, type Document, type Types } from "mongoose";

export interface IBoard extends Document {
  workspaceId: Types.ObjectId;
  projectId: Types.ObjectId;
  name: string;
  description?: string;
  createdBy: Types.ObjectId;
}

const boardSchema = new Schema<IBoard>(
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

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

boardSchema.index({
  workspaceId: 1,
  projectId: 1,
  createdAt: -1,
});

boardSchema.index(
  {
    workspaceId: 1,
    name: "text",
    description: "text",
  },
  {
    name: "board_workspace_text_search",
    weights: {
      name: 5,
      description: 1,
    },
  },
);

export const Board = model<IBoard>("Board", boardSchema);
