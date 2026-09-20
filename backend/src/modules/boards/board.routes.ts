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

router.get(
  "/",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  getProjectBoards,
);

router.post(
  "/",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER"),
  validate(createBoardSchema),
  createBoard,
);

router.get(
  "/:boardId",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER", "VIEWER"),
  getBoardById,
);

router.patch(
  "/:boardId",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN", "MEMBER"),
  validate(updateBoardSchema),
  updateBoard,
);

router.delete(
  "/:boardId",
  authenticate,
  requireWorkspaceRole("OWNER", "ADMIN"),
  deleteBoard,
);

export default router;
