import mongoose from "mongoose";

import { Project } from "./project.model.js";
import { AppError } from "../../utils/app-error.js";
import { deleteProjectTree } from "../../services/resource-cleanup.service.js";
import { deleteStoredFiles } from "../attachments/attachment.storage.js";
import { env } from "../../config/env.js";
import {
  deleteCacheKeys,
  getCachedJson,
  setCachedJson,
} from "../../services/cache.service.js";
import {
  getProjectCacheKey,
  getWorkspaceProjectsCacheKey,
} from "./project.cache.js";

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

  const project = await Project.create({
    workspaceId,
    name,
    ...(description !== undefined && { description }),
    createdBy: userId,
  });

  await deleteCacheKeys(getWorkspaceProjectsCacheKey(workspaceId));

  return project;
};

export const getWorkspaceProjects = async (workspaceId: string) => {
  validateObjectId(workspaceId, "workspaceId");

  const cacheKey = getWorkspaceProjectsCacheKey(workspaceId);
  const cached = await getCachedJson<unknown[]>(cacheKey);

  if (cached) {
    return cached;
  }

  const projects = await Project.find({ workspaceId })
    .sort({ createdAt: -1 })
    .lean();

  await setCachedJson(cacheKey, projects, env.CACHE_TTL_SECONDS);

  return projects;
};

export const getProjectById = async (
  workspaceId: string,
  projectId: string,
) => {
  validateObjectId(workspaceId, "workspaceId");
  validateObjectId(projectId, "projectId");

  const cacheKey = getProjectCacheKey(workspaceId, projectId);
  const cached = await getCachedJson<Record<string, unknown>>(cacheKey);

  if (cached) {
    return cached;
  }

  const project = await Project.findOne({
    _id: projectId,
    workspaceId,
  }).lean();

  if (!project) {
    throw new AppError(404, "Project not found");
  }

  await setCachedJson(cacheKey, project, env.CACHE_TTL_SECONDS);

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
      returnDocument: "after",
      runValidators: true,
    },
  );

  if (!project) {
    throw new AppError(404, "Project not found");
  }

  await deleteCacheKeys(
    getWorkspaceProjectsCacheKey(workspaceId),
    getProjectCacheKey(workspaceId, projectId),
  );

  return project;
};

export const deleteProject = async (
  workspaceId: string,
  projectId: string,
): Promise<void> => {
  validateObjectId(workspaceId, "workspaceId");
  validateObjectId(projectId, "projectId");

  const session = await mongoose.startSession();

  let attachmentPaths: string[] = [];

  try {
    await session.withTransaction(async () => {
      attachmentPaths = await deleteProjectTree(
        {
          projectId,
          workspaceId,
        },
        session,
      );
    });
  } finally {
    await session.endSession();
  }

  await deleteStoredFiles(attachmentPaths);

  await deleteCacheKeys(
    getWorkspaceProjectsCacheKey(workspaceId),
    getProjectCacheKey(workspaceId, projectId),
  );
};
