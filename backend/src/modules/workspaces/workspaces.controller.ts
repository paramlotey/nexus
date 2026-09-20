import type { NextFunction, Request, Response } from "express";

import * as workspaceService from "./workspace.service.js";
import { AppError } from "../../utils/app-error.js";
import { recordAuditLog } from "../audit/audit.service.js";

const getRequiredParam = (req: Request, paramName: string): string => {
  const value = req.params[paramName];

  if (typeof value !== "string" || value.trim() === "") {
    throw new AppError(400, `Invalid ${paramName}`);
  }

  return value;
};

export const createWorkspace = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const workspace = await workspaceService.createWorkspace({
      name: req.body.name,
      userId: req.user.userId,
    });

    if (!workspace) {
      throw new AppError(500, "Workspace could not be created");
    }

    await recordAuditLog({
      workspaceId: workspace._id.toString(),
      actorId: req.user.userId,
      action: "WORKSPACE_CREATED",
      entityType: "WORKSPACE",
      entityId: workspace._id.toString(),
      metadata: { name: workspace.name },
    });

    res.status(201).json({
      success: true,
      data: workspace,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyWorkspaces = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const workspaces = await workspaceService.getUserWorkspaces(
      req.user.userId,
    );

    res.status(200).json({
      success: true,
      data: workspaces,
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkspaceById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const workspaceId = getRequiredParam(req, "workspaceId");
    if (!workspaceId) return;

    const workspace = await workspaceService.getWorkspaceById(workspaceId);

    res.status(200).json({
      success: true,
      data: {
        workspace,
        role: req.workspaceMember?.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkspaceMembers = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const workspaceId = getRequiredParam(req, "workspaceId");
    if (!workspaceId) return;

    const members = await workspaceService.getWorkspaceMembers(workspaceId);

    res.status(200).json({
      success: true,
      data: members,
    });
  } catch (error) {
    next(error);
  }
};

export const addWorkspaceMember = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.workspaceMember) {
      throw new AppError(403, "Workspace access required");
    }

    const workspaceId = getRequiredParam(req, "workspaceId");
    if (!workspaceId) return;

    const member = await workspaceService.addWorkspaceMember({
      workspaceId,
      email: req.body.email,
      role: req.body.role,
      actingUser: req.workspaceMember.role,
    });

    await recordAuditLog({
      workspaceId,
      actorId: req.workspaceMember.userId,
      action: "MEMBER_ADDED",
      entityType: "MEMBER",
      entityId: member._id.toString(),
      metadata: {
        targetUserId: member.userId.toString(),
        role: member.role,
      },
    });

    res.status(201).json({
      success: true,
      data: member,
    });
  } catch (error) {
    next(error);
  }
};

export const updateWorkspaceMemberRole = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.workspaceMember) {
      throw new AppError(403, "Workspace access required");
    }

    const workspaceId = getRequiredParam(req, "workspaceId");
    if (!workspaceId) return;

    const memberId = getRequiredParam(req, "memberId");
    if (!memberId) return;

    const member = await workspaceService.updateWorkspaceMemberRole({
      workspaceId,
      memberId,
      role: req.body.role,
      actingUser: req.workspaceMember.role,
    });

    await recordAuditLog({
      workspaceId,
      actorId: req.workspaceMember.userId,
      action: "MEMBER_ROLE_UPDATED",
      entityType: "MEMBER",
      entityId: member._id.toString(),
      metadata: {
        targetUserId: member.userId.toString(),
        role: member.role,
      },
    });

    res.status(200).json({
      success: true,
      data: member,
    });
  } catch (error) {
    next(error);
  }
};

export const removeWorkspaceMember = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.workspaceMember) {
      throw new AppError(403, "Workspace access required");
    }

    const workspaceId = getRequiredParam(req, "workspaceId");
    if (!workspaceId) return;

    const memberId = getRequiredParam(req, "memberId");
    if (!memberId) return;

    await workspaceService.removeWorkspaceMember(
      workspaceId,
      memberId,
      req.workspaceMember.role,
    );

    await recordAuditLog({
      workspaceId,
      actorId: req.workspaceMember.userId,
      action: "MEMBER_REMOVED",
      entityType: "MEMBER",
      entityId: memberId,
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
