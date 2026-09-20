import { Router } from "express";

import {
  createComment,
  deleteComment,
  getTaskComments,
  updateComment,
} from "./comment.controller.js";

import {
  createCommentSchema,
  updateCommentSchema,
} from "./comment.validation.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { requireWorkspaceRole } from "../../middleware/workspace-role.middleware.js";

const router = Router({
  mergeParams: true,
});

/**
 * @openapi
 * /api/workspaces/{workspaceId}/projects/{projectId}/boards/{boardId}/tasks/{taskId}/comments:
 *   get:
 *     tags:
 *       - Comments
 *     summary: List task comments
 *     description: Returns all comments for a task ordered by creation time.
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
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comments returned successfully
 *       400:
 *         description: Invalid resource ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Workspace access denied
 *       404:
 *         description: Task not found
 */
router.get(
  "/",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  getTaskComments,
);

/**
 * @openapi
 * /api/workspaces/{workspaceId}/projects/{projectId}/boards/{boardId}/tasks/{taskId}/comments:
 *   post:
 *     tags:
 *       - Comments
 *     summary: Create a task comment
 *     description: OWNER, ADMIN and MEMBER can add comments to a task.
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
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 2000
 *                 example: Please update the validation before moving this task to review.
 *     responses:
 *       201:
 *         description: Comment created successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient workspace permissions
 *       404:
 *         description: Task not found
 */
router.post(
  "/",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER"),
  validate(createCommentSchema),
  createComment,
);

/**
 * @openapi
 * /api/workspaces/{workspaceId}/projects/{projectId}/boards/{boardId}/tasks/{taskId}/comments/{commentId}:
 *   patch:
 *     tags:
 *       - Comments
 *     summary: Update a comment
 *     description: A user can only edit their own comment.
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
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 2000
 *                 example: Updated comment content.
 *     responses:
 *       200:
 *         description: Comment updated successfully
 *       400:
 *         description: Invalid request or comment ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: User cannot edit this comment
 *       404:
 *         description: Task or comment not found
 */
router.patch(
  "/:commentId",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER"),
  validate(updateCommentSchema),
  updateComment,
);

/**
 * @openapi
 * /api/workspaces/{workspaceId}/projects/{projectId}/boards/{boardId}/tasks/{taskId}/comments/{commentId}:
 *   delete:
 *     tags:
 *       - Comments
 *     summary: Delete a comment
 *     description: Authors can delete their own comments. OWNER and ADMIN can also moderate and delete other users' comments.
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
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Comment deleted successfully
 *       400:
 *         description: Invalid comment ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: User cannot delete this comment
 *       404:
 *         description: Task or comment not found
 */
router.delete(
  "/:commentId",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER"),
  deleteComment,
);

export default router;
