import { Router } from "express";

import {
  createAttachment,
  deleteAttachment,
  downloadAttachment,
  getTaskAttachments,
} from "./attachment.controller.js";

import { uploadSingleAttachment } from "./attachment.upload.js";

import { authenticate } from "../../middleware/auth.middleware.js";
import { requireWorkspaceRole } from "../../middleware/workspace-role.middleware.js";

const router = Router({
  mergeParams: true,
});

/**
 * @openapi
 * /api/workspaces/{workspaceId}/projects/{projectId}/boards/{boardId}/tasks/{taskId}/attachments:
 *   get:
 *     tags:
 *       - Attachments
 *     summary: List task attachments
 *     description: Returns attachment metadata for a task.
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
 *         description: Attachments returned successfully
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
  getTaskAttachments,
);

/**
 * @openapi
 * /api/workspaces/{workspaceId}/projects/{projectId}/boards/{boardId}/tasks/{taskId}/attachments:
 *   post:
 *     tags:
 *       - Attachments
 *     summary: Upload a task attachment
 *     description: Uploads one supported file up to 10 MB and associates it with the task.
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Attachment uploaded successfully
 *       400:
 *         description: Missing file, unsupported type, or file exceeds size limit
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
  uploadSingleAttachment,
  createAttachment,
);

/**
 * @openapi
 * /api/workspaces/{workspaceId}/projects/{projectId}/boards/{boardId}/tasks/{taskId}/attachments/{attachmentId}/download:
 *   get:
 *     tags:
 *       - Attachments
 *     summary: Download a task attachment
 *     description: Downloads the physical file using the attachment's original filename.
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
 *         name: attachmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Attachment file
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Invalid attachment ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Workspace access denied
 *       404:
 *         description: Task, attachment, or physical file not found
 */
router.get(
  "/:attachmentId/download",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  downloadAttachment,
);

/**
 * @openapi
 * /api/workspaces/{workspaceId}/projects/{projectId}/boards/{boardId}/tasks/{taskId}/attachments/{attachmentId}:
 *   delete:
 *     tags:
 *       - Attachments
 *     summary: Delete a task attachment
 *     description: Uploaders can delete their own attachments. OWNER and ADMIN can also delete attachments uploaded by other members.
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
 *         name: attachmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Attachment deleted successfully
 *       400:
 *         description: Invalid attachment ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: User cannot delete this attachment
 *       404:
 *         description: Task or attachment not found
 */
router.delete(
  "/:attachmentId",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER"),
  deleteAttachment,
);

export default router;
