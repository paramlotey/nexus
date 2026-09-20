import mongoose from "mongoose";

import { Project } from "./project.model.js";
import { AppError } from "../../utils/app-error.js";

interface CreateProjectInput {
  workspaceId: string;
  name: string;
  description?: string;
  userId: string;
}

interface UpdateProjectInput {
  workspaceId: string;
  projectId: string;
  name?: string;
  description?: string;
}

const validateObjectId = (value: string, field: string): void => {
  if (!mongoose.isValidObjectId(value)) {
    throw new AppError(400, `Invalid ${field}`);
  }
};

export const createProject = async ({
  workspaceId,
  name,
  description,
  userId,
}: CreateProjectInput) => {
  validateObjectId(workspaceId, "workspaceId");

  return Project.create({
    workspaceId,
    name,
    ...(description !== undefined && { description }),
    createdBy: userId,
  });
};

export const getWorkspaceProjects = async (workspaceId: string) => {
  validateObjectId(workspaceId, "workspaceId");

  return Project.find({ workspaceId }).sort({ createdAt: -1 }).lean();
};

export const getProjectById = async (
  workspaceId: string,
  projectId: string,
) => {
  validateObjectId(workspaceId, "workspaceId");
  validateObjectId(projectId, "projectId");

  const project = await Project.findOne({
    _id: projectId,
    workspaceId,
  }).lean();

  if (!project) {
    throw new AppError(404, "Project not found");
  }

  return project;
};

export const updateProject = async ({
  workspaceId,
  projectId,
  name,
  description,
}: UpdateProjectInput) => {
  validateObjectId(workspaceId, "workspaceId");
  validateObjectId(projectId, "projectId");

  const project = await Project.findOneAndUpdate(
    {
      _id: projectId,
      workspaceId,
    },
    {
      $set: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
      },
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!project) {
    throw new AppError(404, "Project not found");
  }

  return project;
};

export const deleteProject = async (
  workspaceId: string,
  projectId: string,
): Promise<void> => {
  validateObjectId(workspaceId, "workspaceId");
  validateObjectId(projectId, "projectId");

  const project = await Project.findOneAndDelete({
    _id: projectId,
    workspaceId,
  });

  if (!project) {
    throw new AppError(404, "Project not found");
  }
};
