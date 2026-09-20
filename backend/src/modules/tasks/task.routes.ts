import { Router } from "express";

import {
  createTask,
  deleteTask,
  getBoardTasks,
  getTaskById,
  moveTask,
  updateTask,
} from "./task.controller.js";

import {
  createTaskSchema,
  moveTaskSchema,
  updateTaskSchema,
} from "./task.validation.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { requireWorkspaceRole } from "../../middleware/workspace-role.middleware.js";

const router = Router({
  mergeParams: true,
});

/**
 * @openapi
 * /api/workspaces/{workspaceId}/projects/{projectId}/boards/{boardId}/tasks:
 *   get:
 *     tags:
 *       - Tasks
 *     summary: List board tasks
 *     description: Returns all tasks belonging to the board.
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
 *         description: Tasks returned successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Workspace access denied
 */
router.get(
  "/",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  getBoardTasks,
);

/**
 * @openapi
 * /api/workspaces/{workspaceId}/projects/{projectId}/boards/{boardId}/tasks:
 *   post:
 *     tags:
 *       - Tasks
 *     summary: Create a task
 *     description: Creates a task inside a board column. OWNER, ADMIN and MEMBER can create tasks.
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
 *             $ref: '#/components/schemas/CreateTaskRequest'
 *     responses:
 *       201:
 *         description: Task created successfully
 *       400:
 *         description: Invalid request or assignee
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient workspace permissions
 *       404:
 *         description: Column not found
 */
router.post(
  "/",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER"),
  validate(createTaskSchema),
  createTask,
);

/**
 * @openapi
 * /api/workspaces/{workspaceId}/projects/{projectId}/boards/{boardId}/tasks/{taskId}:
 *   get:
 *     tags:
 *       - Tasks
 *     summary: Get task details
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
 *         description: Task returned successfully
 *       400:
 *         description: Invalid task ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Workspace access denied
 *       404:
 *         description: Task not found
 */
router.get(
  "/:taskId",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  getTaskById,
);

/**
 * @openapi
 * /api/workspaces/{workspaceId}/projects/{projectId}/boards/{boardId}/tasks/{taskId}/move:
 *   patch:
 *     tags:
 *       - Tasks
 *     summary: Move or reorder a task
 *     description: Moves a task within its current column or into another column while maintaining task positions.
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
 *             $ref: '#/components/schemas/MoveTaskRequest'
 *     responses:
 *       200:
 *         description: Task moved successfully
 *       400:
 *         description: Invalid target position or ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient workspace permissions
 *       404:
 *         description: Task or target column not found
 */
router.patch(
  "/:taskId/move",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER"),
  validate(moveTaskSchema),
  moveTask,
);

/**
 * @openapi
 * /api/workspaces/{workspaceId}/projects/{projectId}/boards/{boardId}/tasks/{taskId}:
 *   patch:
 *     tags:
 *       - Tasks
 *     summary: Update a task
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
 *             $ref: '#/components/schemas/UpdateTaskRequest'
 *     responses:
 *       200:
 *         description: Task updated successfully
 *       400:
 *         description: Invalid request or assignee
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient workspace permissions
 *       404:
 *         description: Task not found
 */
router.patch(
  "/:taskId",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER"),
  validate(updateTaskSchema),
  updateTask,
);

/**
 * @openapi
 * /api/workspaces/{workspaceId}/projects/{projectId}/boards/{boardId}/tasks/{taskId}:
 *   delete:
 *     tags:
 *       - Tasks
 *     summary: Delete a task
 *     description: Deletes a task and closes the position gap in its column.
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
 *       204:
 *         description: Task deleted successfully
 *       400:
 *         description: Invalid task ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient workspace permissions
 *       404:
 *         description: Task not found
 */
router.delete(
  "/:taskId",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER"),
  deleteTask,
);

export default router;
