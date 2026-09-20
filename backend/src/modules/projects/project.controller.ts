import type { NextFunction, Request, Response } from "express";

import * as projectService from "./project.service.js";
import { AppError } from "../../utils/app-error.js";
import { recordAuditLog } from "../audit/audit.service.js";

const getRequiredParam = (req: Request, paramName: string): string => {
  const value = req.params[paramName];

  if (typeof value !== "string" || value.trim() === "") {
    throw new AppError(400, `Invalid ${paramName}`);
  }

  return value;
};

export const createProject = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const workspaceId = getRequiredParam(req, "workspaceId");

    const project = await projectService.createProject({
      workspaceId,
      name: req.body.name,
      description: req.body.description,
      userId: req.user.userId,
    });

    await recordAuditLog({
      workspaceId,
      actorId: req.user.userId,
      action: "PROJECT_CREATED",
      entityType: "PROJECT",
      entityId: project._id.toString(),
      metadata: { name: project.name },
    });

    res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkspaceProjects = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const workspaceId = getRequiredParam(req, "workspaceId");

    const projects = await projectService.getWorkspaceProjects(workspaceId);

    res.status(200).json({
      success: true,
      data: projects,
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const workspaceId = getRequiredParam(req, "workspaceId");

    const projectId = getRequiredParam(req, "projectId");

    const project = await projectService.getProjectById(workspaceId, projectId);

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const workspaceId = getRequiredParam(req, "workspaceId");

    const projectId = getRequiredParam(req, "projectId");

    const project = await projectService.updateProject({
      workspaceId,
      projectId,
      name: req.body.name,
      description: req.body.description,
    });

    await recordAuditLog({
      workspaceId,
      actorId: req.user.userId,
      action: "PROJECT_UPDATED",
      entityType: "PROJECT",
      entityId: project._id.toString(),
      metadata: { changedFields: Object.keys(req.body) },
    });

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const workspaceId = getRequiredParam(req, "workspaceId");

    const projectId = getRequiredParam(req, "projectId");

    await projectService.deleteProject(workspaceId, projectId);

    await recordAuditLog({
      workspaceId,
      actorId: req.user.userId,
      action: "PROJECT_DELETED",
      entityType: "PROJECT",
      entityId: projectId,
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
