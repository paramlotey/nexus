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

/**
 * @openapi
 * /api/workspaces/{workspaceId}/projects:
 *   get:
 *     tags:
 *       - Projects
 *     summary: List workspace projects
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Projects returned successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Workspace access denied
 */
router.get(
  "/projects",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  getWorkspaceProjects,
);

/**
 * @openapi
 * /api/workspaces/{workspaceId}/projects:
 *   post:
 *     tags:
 *       - Projects
 *     summary: Create a project
 *     description: OWNER, ADMIN and MEMBER can create projects.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProjectRequest'
 *     responses:
 *       201:
 *         description: Project created successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient workspace permissions
 */
router.post(
  "/projects",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER"),
  validate(createProjectSchema),
  createProject,
);

/**
 * @openapi
 * /api/workspaces/{workspaceId}/projects/{projectId}:
 *   get:
 *     tags:
 *       - Projects
 *     summary: Get project details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project returned successfully
 *       400:
 *         description: Invalid project ID
 *       403:
 *         description: Workspace access denied
 *       404:
 *         description: Project not found
 */
router.get(
  "/projects/:projectId",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  getProjectById,
);

/**
 * @openapi
 * /api/workspaces/{workspaceId}/projects/{projectId}:
 *   patch:
 *     tags:
 *       - Projects
 *     summary: Update project
 *     description: OWNER, ADMIN and MEMBER can update projects.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProjectRequest'
 *     responses:
 *       200:
 *         description: Project updated successfully
 *       400:
 *         description: Invalid request
 *       403:
 *         description: Insufficient workspace permissions
 *       404:
 *         description: Project not found
 */
router.patch(
  "/projects/:projectId",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER"),
  validate(updateProjectSchema),
  updateProject,
);

/**
 * @openapi
 * /api/workspaces/{workspaceId}/projects/{projectId}:
 *   delete:
 *     tags:
 *       - Projects
 *     summary: Delete project
 *     description: Only OWNER and ADMIN can delete projects.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Project deleted successfully
 *       400:
 *         description: Invalid project ID
 *       403:
 *         description: Insufficient workspace permissions
 *       404:
 *         description: Project not found
 */
router.delete(
  "/projects/:projectId",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN"),
  deleteProject,
);

export default router;
