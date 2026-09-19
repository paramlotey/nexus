import { z } from "zod";

export const createWorkspaceSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(80),
  }),
});
export const addWorkspaceMemberSchema = z.object({
  body: z.object({
    email: z.email(),
    role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
  }),
});

export const updateWorkspaceMemberRoleSchema = z.object({
  body: z.object({
    role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
  }),
});
