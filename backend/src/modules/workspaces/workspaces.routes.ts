import { Router } from "express";
import { createWorkspaceSchema } from "./workspace.validation.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { createWorkspace } from "./workspaces.controller.js";

const router = Router();

router.post(
  "/",
  authenticate,
  validate(createWorkspaceSchema),
  createWorkspace,
);

export default router;
