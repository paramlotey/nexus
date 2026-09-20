import { Schema, model, type Document, type Types } from "mongoose";

export interface IComment extends Document {
  workspaceId: Types.ObjectId;
  projectId: Types.ObjectId;
  boardId: Types.ObjectId;
  taskId: Types.ObjectId;
  authorId: Types.ObjectId;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
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

    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
  },
);

commentSchema.index({
  workspaceId: 1,
  projectId: 1,
  boardId: 1,
  taskId: 1,
  createdAt: 1,
});

commentSchema.index(
  {
    workspaceId: 1,
    content: "text",
  },
  {
    name: "comment_workspace_text_search",
  },
);

export const Comment = model<IComment>("Comment", commentSchema);
