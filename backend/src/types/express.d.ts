import { WorkspaceRole } from "../modules/workspaces/workspace-member.model.ts";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
      };
      workspaceMember?: {
        workspaceId: string;
        userId: string;
        role: WorkspaceRole;
      };
    }
  }
}

export {};
