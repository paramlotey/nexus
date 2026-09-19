import type { NextFunction, Request, Response } from "express";

import { WorkspaceMember } from "../modules/workspaces/workspace-member.model.js";
import type { WorkspaceRole } from "../modules/workspaces/workspace-member.model.js";
import { AppError } from "../utils/app-error.js";

export const requireWorkspaceRole =
  (...allowedRoles: WorkspaceRole[]) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError(401, "Authentication required");
      }

      const { workspaceId } = req.params;

      if (!workspaceId) {
        throw new AppError(400, "Workspace ID is required");
      }

      const membership = await WorkspaceMember.findOne({
        workspaceId,
        userId: req.user.userId,
      });

      if (!membership) {
        throw new AppError(403, "You are not a member of this workspace");
      }

      if (!allowedRoles.includes(membership.role)) {
        throw new AppError(
          403,
          "You do not have permission to perform this action",
        );
      }

      req.workspaceMember = {
        workspaceId: membership.workspaceId.toString(),
        userId: membership.userId.toString(),
        role: membership.role,
      };

      next();
    } catch (error) {
      next(error);
    }
  };
