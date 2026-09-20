import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { writeFile } from "node:fs/promises";

import { env } from "../config/env.js";
import { User } from "../modules/auth/auth.model.js";
import { Workspace } from "../modules/workspaces/workspace.model.js";
import { WorkspaceMember } from "../modules/workspaces/workspace-member.model.js";
import { Project } from "../modules/projects/project.model.js";
import { generateAccessToken } from "../utils/jwt.js";

const PASSWORD = "Password@123";

const users = [
  {
    name: "Project Owner",
    email: "owner@test.com",
    role: "OWNER" as const,
  },
  {
    name: "Project Admin",
    email: "admin@test.com",
    role: "ADMIN" as const,
  },
  {
    name: "Project Member",
    email: "member@test.com",
    role: "MEMBER" as const,
  },
  {
    name: "Project Viewer",
    email: "viewer@test.com",
    role: "VIEWER" as const,
  },
];

const seed = async (): Promise<void> => {
  if (env.NODE_ENV === "production") {
    throw new Error("Seed script cannot run in production");
  }

  await mongoose.connect(env.MONGO_URI);

  console.log("MongoDB connected");

  const emails = users.map((user) => user.email);

  /*
   * Remove only our test data.
   * We intentionally do NOT wipe the whole database.
   */
  const existingUsers = await User.find({
    email: { $in: emails },
  });

  const existingUserIds = existingUsers.map((user) => user._id);

  const existingWorkspaces = await Workspace.find({
    name: "Project API Test Workspace",
  });

  const workspaceIds = existingWorkspaces.map((workspace) => workspace._id);

  if (workspaceIds.length) {
    await Project.deleteMany({
      workspaceId: { $in: workspaceIds },
    });

    await WorkspaceMember.deleteMany({
      workspaceId: { $in: workspaceIds },
    });

    await Workspace.deleteMany({
      _id: { $in: workspaceIds },
    });
  }

  if (existingUserIds.length) {
    await WorkspaceMember.deleteMany({
      userId: { $in: existingUserIds },
    });

    await User.deleteMany({
      _id: { $in: existingUserIds },
    });
  }

  const hashedPassword = await bcrypt.hash(PASSWORD, 10);

  const createdUsers = [];

  for (const input of users) {
    const user = await User.create({
      name: input.name,
      email: input.email,
      password: hashedPassword,
    });

    createdUsers.push({
      ...input,
      user,
    });
  }

  const owner = createdUsers.find((item) => item.role === "OWNER");

  if (!owner) {
    throw new Error("Owner could not be created");
  }

  const workspace = await Workspace.create({
    name: "Project API Test Workspace",
    slug: "project-api-test-workspace",
    createdBy: owner.user._id,
  });

  for (const item of createdUsers) {
    await WorkspaceMember.create({
      workspaceId: workspace._id,
      userId: item.user._id,
      role: item.role,
    });
  }

  const project = await Project.create({
    workspaceId: workspace._id,
    name: "Website Redesign",
    description: "Project API manual testing project",
    createdBy: owner.user._id,
  });

  const result = {
    password: PASSWORD,

    workspaceId: workspace._id.toString(),

    projectId: project._id.toString(),

    users: Object.fromEntries(
      createdUsers.map((item) => [
        item.role.toLowerCase(),
        {
          userId: item.user._id.toString(),
          email: item.email,
          role: item.role,

          accessToken: generateAccessToken({
            userId: item.user._id.toString(),
          }),
        },
      ]),
    ),
  };

  await writeFile("seed-output.json", JSON.stringify(result, null, 2), "utf8");

  console.log("\nSeed completed successfully\n");
  console.log(JSON.stringify(result, null, 2));
  console.log("\nSaved to seed-output.json");
};

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
