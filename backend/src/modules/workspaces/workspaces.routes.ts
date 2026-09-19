import { Router } from "express";

import {
  addWorkspaceMemberSchema,
  createWorkspaceSchema,
  updateWorkspaceMemberRoleSchema,
} from "./workspace.validation.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { requireWorkspaceRole } from "../../middleware/workspace-role.middleware.js";

import {
  addWorkspaceMember,
  createWorkspace,
  getMyWorkspaces,
  getWorkspaceById,
  getWorkspaceMembers,
  removeWorkspaceMember,
  updateWorkspaceMemberRole,
} from "./workspaces.controller.js";

const router = Router();

/**
 * @openapi
 * /api/workspaces:
 *   post:
 *     tags:
 *       - Workspaces
 *     summary: Create a workspace
 *     description: Creates a workspace and assigns the authenticated user as OWNER.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateWorkspaceRequest'
 *     responses:
 *       201:
 *         description: Workspace created successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Authentication required
 */
router.post(
  "/",
  authenticate,
  validate(createWorkspaceSchema),
  createWorkspace,
);

/**
 * @openapi
 * /api/workspaces:
 *   get:
 *     tags:
 *       - Workspaces
 *     summary: List my workspaces
 *     description: Returns workspaces where the authenticated user has a membership.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Workspace list returned successfully
 *       401:
 *         description: Authentication required
 */
router.get("/", authenticate, getMyWorkspaces);

/**
 * @openapi
 * /api/workspaces/{workspaceId}:
 *   get:
 *     tags:
 *       - Workspaces
 *     summary: Get workspace details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Workspace ID
 *     responses:
 *       200:
 *         description: Workspace returned successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: User is not a member of the workspace
 *       404:
 *         description: Workspace not found
 */
router.get(
  "/:workspaceId",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  getWorkspaceById,
);

/**
 * @openapi
 * /api/workspaces/{workspaceId}/members:
 *   get:
 *     tags:
 *       - Workspace Members
 *     summary: List workspace members
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Workspace ID
 *     responses:
 *       200:
 *         description: Workspace members returned successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Workspace access denied
 */
router.get(
  "/:workspaceId/members",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  getWorkspaceMembers,
);

/**
 * @openapi
 * /api/workspaces/{workspaceId}/members:
 *   post:
 *     tags:
 *       - Workspace Members
 *     summary: Add a workspace member
 *     description: OWNER can add ADMIN, MEMBER or VIEWER. ADMIN can add MEMBER or VIEWER.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Workspace ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WorkspaceMemberRequest'
 *     responses:
 *       201:
 *         description: Member added successfully
 *       400:
 *         description: Invalid request
 *       403:
 *         description: Insufficient workspace permissions
 *       404:
 *         description: User not found
 *       409:
 *         description: User is already a workspace member
 */
router.post(
  "/:workspaceId/members",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN"),
  validate(addWorkspaceMemberSchema),
  addWorkspaceMember,
);

/**
 * @openapi
 * /api/workspaces/{workspaceId}/members/{memberId}:
 *   patch:
 *     tags:
 *       - Workspace Members
 *     summary: Update workspace member role
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Workspace ID
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *         description: Workspace membership ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateWorkspaceRoleRequest'
 *     responses:
 *       200:
 *         description: Member role updated successfully
 *       400:
 *         description: Invalid request
 *       403:
 *         description: Insufficient workspace permissions
 *       404:
 *         description: Workspace member not found
 */
router.patch(
  "/:workspaceId/members/:memberId",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN"),
  validate(updateWorkspaceMemberRoleSchema),
  updateWorkspaceMemberRole,
);

/**
 * @openapi
 * /api/workspaces/{workspaceId}/members/{memberId}:
 *   delete:
 *     tags:
 *       - Workspace Members
 *     summary: Remove workspace member
 *     description: Removes a workspace member. The workspace OWNER cannot be removed using this endpoint.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Workspace ID
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *         description: Workspace membership ID
 *     responses:
 *       204:
 *         description: Member removed successfully
 *       403:
 *         description: Insufficient workspace permissions
 *       404:
 *         description: Workspace member not found
 */
router.delete(
  "/:workspaceId/members/:memberId",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN"),
  removeWorkspaceMember,
);

export default router;
