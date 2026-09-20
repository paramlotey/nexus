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

router.get(
  "/",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  getBoardColumns,
);

router.post(
  "/",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER"),
  validate(createColumnSchema),
  createColumn,
);

/*
 * IMPORTANT:
 * /reorder must come before /:columnId
 */
router.patch(
  "/reorder",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER"),
  validate(reorderColumnsSchema),
  reorderColumns,
);

router.patch(
  "/:columnId",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER"),
  validate(updateColumnSchema),
  updateColumn,
);

router.delete(
  "/:columnId",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER"),
  deleteColumn,
);

export default router;
