import { Router } from "express";
import { getAuditLogs } from "./audit.controller.js";
import { getAuditLogsSchema } from "./audit.validation.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireWorkspaceRole } from "../../middleware/workspace-role.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";

const router = Router({
  mergeParams: true,
});

/**
 * @openapi
 * /api/workspaces/{workspaceId}/audit-logs:
 *   get:
 *     tags:
 *       - Audit Logs
 *     summary: Get workspace audit logs
 *     description: Returns a paginated activity history for the workspace. Only OWNER and ADMIN can access audit logs.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *
 *       - in: query
 *         name: action
 *         required: false
 *         schema:
 *           type: string
 *           enum:
 *             - WORKSPACE_CREATED
 *             - MEMBER_ADDED
 *             - MEMBER_ROLE_UPDATED
 *             - MEMBER_REMOVED
 *             - PROJECT_CREATED
 *             - PROJECT_UPDATED
 *             - PROJECT_DELETED
 *             - BOARD_CREATED
 *             - BOARD_UPDATED
 *             - BOARD_DELETED
 *             - COLUMN_CREATED
 *             - COLUMN_UPDATED
 *             - COLUMN_REORDERED
 *             - COLUMN_DELETED
 *             - TASK_CREATED
 *             - TASK_UPDATED
 *             - TASK_MOVED
 *             - TASK_DELETED
 *             - COMMENT_CREATED
 *             - COMMENT_UPDATED
 *             - COMMENT_DELETED
 *             - ATTACHMENT_UPLOADED
 *             - ATTACHMENT_DELETED
 *
 *       - in: query
 *         name: entityType
 *         required: false
 *         schema:
 *           type: string
 *           enum:
 *             - WORKSPACE
 *             - MEMBER
 *             - PROJECT
 *             - BOARD
 *             - COLUMN
 *             - TASK
 *             - COMMENT
 *             - ATTACHMENT
 *
 *       - in: query
 *         name: actorId
 *         required: false
 *         schema:
 *           type: string
 *
 *     responses:
 *       200:
 *         description: Audit logs returned successfully
 *       400:
 *         description: Invalid query or workspace ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: OWNER or ADMIN access required
 */
router.get(
  "/",
  authenticate,

  requireWorkspaceRole("OWNER", "ADMIN"),

  validate(getAuditLogsSchema),

  getAuditLogs,
);

export default router;
