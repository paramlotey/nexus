import { Schema, model, type Document, type Types } from "mongoose";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface ITask extends Document {
  workspaceId: Types.ObjectId;
  projectId: Types.ObjectId;
  boardId: Types.ObjectId;
  columnId: Types.ObjectId;

  title: string;
  description?: string;

  priority: TaskPriority;
  position: number;

  assigneeIds: Types.ObjectId[];

  createdBy: Types.ObjectId;

  dueDate?: Date;
  completedAt?: Date;
}

const taskSchema = new Schema<ITask>(
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

    columnId: {
      type: Schema.Types.ObjectId,
      ref: "Column",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 5000,
    },

    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      default: "MEDIUM",
    },

    position: {
      type: Number,
      required: true,
      min: 0,
    },

    assigneeIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    dueDate: {
      type: Date,
    },

    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

taskSchema.index({
  workspaceId: 1,
  boardId: 1,
  columnId: 1,
  position: 1,
});

taskSchema.index({
  workspaceId: 1,
  assigneeIds: 1,
});

export const Task = model<ITask>("Task", taskSchema);
