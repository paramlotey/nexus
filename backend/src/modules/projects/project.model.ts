import { Schema, model, type Document, type Types } from "mongoose";

export interface IProject extends Document {
  workspaceId: Types.ObjectId;
  name: string;
  description?: string;
  createdBy: Types.ObjectId;
}

const projectSchema = new Schema<IProject>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
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

projectSchema.index({
  workspaceId: 1,
  createdAt: -1,
});

export const Project = model<IProject>("Project", projectSchema);
