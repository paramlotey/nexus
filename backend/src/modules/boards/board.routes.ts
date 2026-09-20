import { Router } from "express";

import {
  createBoard,
  deleteBoard,
  getBoardById,
  getProjectBoards,
  updateBoard,
} from "./board.controller.js";

import { createBoardSchema, updateBoardSchema } from "./board.validation.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { requireWorkspaceRole } from "../../middleware/workspace-role.middleware.js";

const router = Router({
  mergeParams: true,
});

/**
 * @openapi
 * /api/workspaces/{workspaceId}/projects/{projectId}/boards:
 *   get:
 *     tags:
 *       - Boards
 *     summary: List project boards
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
 *         description: Boards returned successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Workspace access denied
 *       404:
 *         description: Project not found
 */
router.get(
  "/",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  getProjectBoards,
);

/**
 * @openapi
 * /api/workspaces/{workspaceId}/projects/{projectId}/boards:
 *   post:
 *     tags:
 *       - Boards
 *     summary: Create a board
 *     description: OWNER, ADMIN and MEMBER can create boards.
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
 *             $ref: '#/components/schemas/CreateBoardRequest'
 *     responses:
 *       201:
 *         description: Board created successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Project not found
 */
router.post(
  "/",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER"),
  validate(createBoardSchema),
  createBoard,
);

/**
 * @openapi
 * /api/workspaces/{workspaceId}/projects/{projectId}/boards/{boardId}:
 *   get:
 *     tags:
 *       - Boards
 *     summary: Get board details
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
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Board returned successfully
 *       400:
 *         description: Invalid board ID
 *       403:
 *         description: Workspace access denied
 *       404:
 *         description: Board or project not found
 */
router.get(
  "/:boardId",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  getBoardById,
);

/**
 * @openapi
 * /api/workspaces/{workspaceId}/projects/{projectId}/boards/{boardId}:
 *   patch:
 *     tags:
 *       - Boards
 *     summary: Update a board
 *     description: OWNER, ADMIN and MEMBER can update boards.
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
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateBoardRequest'
 *     responses:
 *       200:
 *         description: Board updated successfully
 *       400:
 *         description: Invalid request
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Board or project not found
 */
router.patch(
  "/:boardId",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER"),
  validate(updateBoardSchema),
  updateBoard,
);

/**
 * @openapi
 * /api/workspaces/{workspaceId}/projects/{projectId}/boards/{boardId}:
 *   delete:
 *     tags:
 *       - Boards
 *     summary: Delete a board
 *     description: Deletes the board and its columns. Only OWNER and ADMIN can delete boards.
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
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Board deleted successfully
 *       400:
 *         description: Invalid board ID
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Board or project not found
 */
router.delete(
  "/:boardId",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN"),
  deleteBoard,
);

export default router;
