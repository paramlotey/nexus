import { Router } from "express";
import { createWorkspaceSchema } from "./workspace.validation.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import {
  createWorkspace,
  getMyWorkspaces,
  getWorkspaceById,
} from "./workspaces.controller.js";
import { requireWorkspaceRole } from "../../middleware/workspace-role.middleware.js";

const router = Router();

router
  .post("/", authenticate, validate(createWorkspaceSchema), createWorkspace)
  .get("/", authenticate, getMyWorkspaces)
  .get(
    "/:workspaceId",
    authenticate,
    requireWorkspaceRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
    getWorkspaceById,
  );
export default router;
