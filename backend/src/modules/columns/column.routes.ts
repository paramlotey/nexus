import { Router } from "express";

import {
  createColumn,
  deleteColumn,
  getBoardColumns,
  reorderColumns,
  updateColumn,
} from "./column.controller.js";

import {
  createColumnSchema,
  reorderColumnsSchema,
  updateColumnSchema,
} from "./column.validation.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { requireWorkspaceRole } from "../../middleware/workspace-role.middleware.js";

const router = Router({
  mergeParams: true,
});

/**
 * @openapi
 * /api/workspaces/{workspaceId}/projects/{projectId}/boards/{boardId}/columns:
 *   get:
 *     tags:
 *       - Columns
 *     summary: List board columns
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
 *         description: Columns returned in position order
 *       403:
 *         description: Workspace access denied
 *       404:
 *         description: Board not found
 */
router.get(
  "/",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  getBoardColumns,
);

/**
 * @openapi
 * /api/workspaces/{workspaceId}/projects/{projectId}/boards/{boardId}/columns:
 *   post:
 *     tags:
 *       - Columns
 *     summary: Create a board column
 *     description: The column is automatically placed at the end of the board.
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
 *             $ref: '#/components/schemas/CreateColumnRequest'
 *     responses:
 *       201:
 *         description: Column created successfully
 *       400:
 *         description: Invalid request
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Board not found
 */
router.post(
  "/",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER"),
  validate(createColumnSchema),
  createColumn,
);

/**
 * @openapi
 * /api/workspaces/{workspaceId}/projects/{projectId}/boards/{boardId}/columns/reorder:
 *   patch:
 *     tags:
 *       - Columns
 *     summary: Reorder board columns
 *     description: All columns belonging to the board must be supplied in their desired order.
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
 *             $ref: '#/components/schemas/ReorderColumnsRequest'
 *     responses:
 *       200:
 *         description: Columns reordered successfully
 *       400:
 *         description: Invalid or incomplete column order
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Board not found
 */
router.patch(
  "/reorder",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER"),
  validate(reorderColumnsSchema),
  reorderColumns,
);

/**
 * @openapi
 * /api/workspaces/{workspaceId}/projects/{projectId}/boards/{boardId}/columns/{columnId}:
 *   patch:
 *     tags:
 *       - Columns
 *     summary: Update a column
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
 *       - in: path
 *         name: columnId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateColumnRequest'
 *     responses:
 *       200:
 *         description: Column updated successfully
 *       400:
 *         description: Invalid request
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Column or board not found
 */
router.patch(
  "/:columnId",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER"),
  validate(updateColumnSchema),
  updateColumn,
);

/**
 * @openapi
 * /api/workspaces/{workspaceId}/projects/{projectId}/boards/{boardId}/columns/{columnId}:
 *   delete:
 *     tags:
 *       - Columns
 *     summary: Delete a column
 *     description: Deletes the column and closes the remaining position gap.
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
 *       - in: path
 *         name: columnId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Column deleted successfully
 *       400:
 *         description: Invalid column ID
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Column or board not found
 */
router.delete(
  "/:columnId",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER"),
  deleteColumn,
);

export default router;
