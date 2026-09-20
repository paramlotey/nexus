import { Router } from "express";

import {
  getNotifications,
  markAllRead,
  markRead,
} from "./notification.controller.js";
import {
  getNotificationsSchema,
  notificationIdSchema,
} from "./notification.validation.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireWorkspaceRole } from "../../middleware/workspace-role.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";

const router = Router({ mergeParams: true });
const allWorkspaceRoles = requireWorkspaceRole(
  "OWNER",
  "ADMIN",
  "MEMBER",
  "VIEWER",
);

/**
 * @openapi
 * /api/workspaces/{workspaceId}/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Get current user's notifications
 *     description: Returns paginated workspace notifications belonging to the authenticated user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: unreadOnly
 *         schema: { type: boolean, default: false }
 *     responses:
 *       200: { description: Notifications returned successfully }
 *       400: { description: Invalid parameters }
 *       401: { description: Authentication required }
 *       403: { description: Workspace access denied }
 */
router.get(
  "/",
  authenticate,
  allWorkspaceRoles,
  validate(getNotificationsSchema),
  getNotifications,
);

/**
 * @openapi
 * /api/workspaces/{workspaceId}/notifications/read-all:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark all notifications as read
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Notifications marked as read }
 *       401: { description: Authentication required }
 *       403: { description: Workspace access denied }
 */
router.patch("/read-all", authenticate, allWorkspaceRoles, markAllRead);

/**
 * @openapi
 * /api/workspaces/{workspaceId}/notifications/{notificationId}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark one notification as read
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Notification marked as read }
 *       400: { description: Invalid notification ID }
 *       401: { description: Authentication required }
 *       403: { description: Workspace access denied }
 *       404: { description: Notification not found }
 */
router.patch(
  "/:notificationId/read",
  authenticate,
  allWorkspaceRoles,
  validate(notificationIdSchema),
  markRead,
);

export default router;
