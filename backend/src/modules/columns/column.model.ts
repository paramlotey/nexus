import { Schema, model, type Document, type Types } from "mongoose";

export interface IColumn extends Document {
  workspaceId: Types.ObjectId;
  projectId: Types.ObjectId;
  boardId: Types.ObjectId;
  name: string;
  position: number;
}

const columnSchema = new Schema<IColumn>(
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

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    position: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

columnSchema.index({
  workspaceId: 1,
  projectId: 1,
  boardId: 1,
  position: 1,
});

export const Column = model<IColumn>("Column", columnSchema);
