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

router.get(
  "/",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  getTaskComments,
);

router.post(
  "/",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER"),
  validate(createCommentSchema),
  createComment,
);

router.patch(
  "/:commentId",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER"),
  validate(updateCommentSchema),
  updateComment,
);

router.delete(
  "/:commentId",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER"),
  deleteComment,
);

export default router;
