import { Router } from "express";

import { searchWorkspaceController } from "./search.controller.js";
import { searchWorkspaceSchema } from "./search.validation.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireWorkspaceRole } from "../../middleware/workspace-role.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";

const router = Router({
  mergeParams: true,
});

/**
 * @openapi
 * /api/workspaces/{workspaceId}/search:
 *   get:
 *     tags:
 *       - Search
 *     summary: Search workspace resources
 *     description: Searches Projects, Boards, Tasks, Comments and Documents inside the current workspace using MongoDB text search. Results are grouped by resource type.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: q
 *         required: true
 *         description: Search text.
 *         schema:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *         example: authentication
 *       - in: query
 *         name: type
 *         required: false
 *         description: Restrict search to one resource type.
 *         schema:
 *           type: string
 *           enum:
 *             - PROJECT
 *             - BOARD
 *             - TASK
 *             - COMMENT
 *             - DOCUMENT
 *       - in: query
 *         name: limit
 *         required: false
 *         description: Maximum number of results returned per resource type.
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *           default: 10
 *     responses:
 *       200:
 *         description: Search results returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     query:
 *                       type: string
 *                       example: authentication
 *                     results:
 *                       type: object
 *                       properties:
 *                         projects:
 *                           type: array
 *                           items:
 *                             type: object
 *                         boards:
 *                           type: array
 *                           items:
 *                             type: object
 *                         tasks:
 *                           type: array
 *                           items:
 *                             type: object
 *                         comments:
 *                           type: array
 *                           items:
 *                             type: object
 *                         documents:
 *                           type: array
 *                           items:
 *                             type: object
 *                     counts:
 *                       type: object
 *                       properties:
 *                         projects:
 *                           type: integer
 *                         boards:
 *                           type: integer
 *                         tasks:
 *                           type: integer
 *                         comments:
 *                           type: integer
 *                         documents:
 *                           type: integer
 *       400:
 *         description: Invalid workspace ID or search parameters
 *       401:
 *         description: Authentication required
 *       403:
 *         description: User does not belong to the workspace
 */
router.get(
  "/",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  validate(searchWorkspaceSchema),
  searchWorkspaceController,
);

export default router;
