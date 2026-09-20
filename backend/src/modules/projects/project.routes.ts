import { Router } from "express";

import {
  createProject,
  deleteProject,
  getProjectById,
  getWorkspaceProjects,
  updateProject,
} from "./project.controller.js";

import {
  createProjectSchema,
  updateProjectSchema,
} from "./project.validation.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { requireWorkspaceRole } from "../../middleware/workspace-role.middleware.js";

const router = Router({
  mergeParams: true,
});

router.get(
  "/projects",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  getWorkspaceProjects,
);

router.post(
  "/projects",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER"),
  validate(createProjectSchema),
  createProject,
);

router.get(
  "/projects/:projectId",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  getProjectById,
);

router.patch(
  "/projects/:projectId",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER"),
  validate(updateProjectSchema),
  updateProject,
);

router.delete(
  "/projects/:projectId",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN"),
  deleteProject,
);

export default router;
