import mongoose from "mongoose";
import { randomUUID } from "crypto";
import { Workspace } from "./workspace.model.js";
import { WorkspaceMember } from "./workspace-member.model.js";
import { AppError } from "../../utils/app-error.js";

interface CreateWorkspaceInput {
  name: string;
  userId: string;
}

const generateSlug = (name: string): string => {
  const baseSlug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${baseSlug}-${randomUUID().slice(0, 8)}`;
};

export const createWorkspace = async ({
  name,
  userId,
}: CreateWorkspaceInput) => {
  const session = await mongoose.startSession();

  try {
    let createdWorkspace;

    await session.withTransaction(async () => {
      const [workspace] = await Workspace.create(
        [
          {
            name,
            slug: generateSlug(name),
            createdBy: userId,
          },
        ],
        { session },
      );

      if (workspace) {
        await WorkspaceMember.create(
          [
            {
              workspaceId: workspace._id,
              userId,
              role: "OWNER",
            },
          ],
          { session },
        );

        createdWorkspace = workspace;
      }
    });

    return createdWorkspace;
  } finally {
    await session.endSession();
  }
};

export const getUserWorkspaces = async (userId: string) => {
  const memberships = await WorkspaceMember.find({ userId })
    .populate({
      path: "workspaceId",
      model: Workspace,
      select: "name slug createdBy createdAt updatedAt",
    })
    .sort({ createdAt: -1 });
  return memberships.map((membership) => ({
    workspace: membership.workspaceId,
    role: membership.role,
  }));
};

export const getWorkspaceById = async (workspaceId: string) => {
  const workspace = await Workspace.findById(workspaceId);

  if (!workspace) {
    throw new AppError(404, "Workspace not found");
  }

  return workspace;
};
