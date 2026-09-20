import mongoose from "mongoose";
import { randomUUID } from "crypto";
import { Workspace, type IWorkspace } from "./workspace.model.js";
import { WorkspaceMember, WorkspaceRole } from "./workspace-member.model.js";
import { AppError } from "../../utils/app-error.js";
import { User } from "../auth/auth.model.js";

interface CreateWorkspaceInput {
  name: string;
  userId: string;
}

type ManageableRole = Exclude<WorkspaceRole, "OWNER">;

interface AddMemberInput {
  workspaceId: string;
  email: string;
  role: ManageableRole;
  actingUser: WorkspaceRole;
}

interface UpdateMemberRoleInput {
  workspaceId: string;
  memberId: string;
  role: ManageableRole;
  actingUser: WorkspaceRole;
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
    let createdWorkspace: IWorkspace | undefined;

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

export const getWorkspaceMembers = async (workspaceId: string) => {
  return WorkspaceMember.find({ workspaceId })
    .populate("userId", "name email")
    .sort({ createdAt: 1 });
};

export const addWorkspaceMember = async ({
  workspaceId,
  email,
  role,
  actingUser,
}: AddMemberInput) => {
  if (actingUser === "ADMIN" && role === "ADMIN") {
    throw new AppError(403, "Admins cannot add other admins");
  }

  const user = await User.findOne({
    email: email.toLowerCase(),
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  const existingMembership = await WorkspaceMember.findOne({
    workspaceId,
    userId: user._id,
  });

  if (existingMembership) {
    throw new AppError(409, "User is already a workspace member");
  }

  return WorkspaceMember.create({
    workspaceId,
    userId: user._id,
    role,
  });
};

export const updateWorkspaceMemberRole = async ({
  workspaceId,
  memberId,
  role,
  actingUser,
}: UpdateMemberRoleInput) => {
  const member = await WorkspaceMember.findOne({
    _id: memberId,
    workspaceId,
  });

  if (!member) {
    throw new AppError(404, "Workspace member not found");
  }

  if (member.role === "OWNER") {
    throw new AppError(403, "Workspace owner role cannot be changed");
  }

  if (actingUser === "ADMIN" && (member.role === "ADMIN" || role === "ADMIN")) {
    throw new AppError(403, "Admins cannot manage other admins");
  }

  member.role = role;

  await member.save();
  return member;
};

export const removeWorkspaceMember = async (
  workspaceId: string,
  memberId: string,
  actingUser: WorkspaceRole,
) => {
  const member = await WorkspaceMember.findOne({
    _id: memberId,
    workspaceId,
  });

  if (!member) {
    throw new AppError(404, "Workspace member not found");
  }

  if (member.role === "OWNER") {
    throw new AppError(403, "Workspace owner cannot be removed");
  }

  if (actingUser === "ADMIN" && member.role === "ADMIN") {
    throw new AppError(403, "Admins cannot remove other admins");
  }

  await member.deleteOne();
};
