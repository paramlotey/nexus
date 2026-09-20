import mongoose from "mongoose";

import { Comment } from "./comment.model.js";
import { Task } from "../tasks/task.model.js";
import { AppError } from "../../utils/app-error.js";

export interface CommentContext {
  workspaceId: string;
  projectId: string;
  boardId: string;
  taskId: string;
}

type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

const validateObjectId = (value: string, field: string): void => {
  if (!mongoose.isValidObjectId(value)) {
    throw new AppError(400, `Invalid ${field}`);
  }
};

const validateContext = (context: CommentContext): void => {
  validateObjectId(context.workspaceId, "workspaceId");

  validateObjectId(context.projectId, "projectId");

  validateObjectId(context.boardId, "boardId");

  validateObjectId(context.taskId, "taskId");
};

const ensureTaskExists = async (context: CommentContext): Promise<void> => {
  validateContext(context);

  const task = await Task.exists({
    _id: context.taskId,
    workspaceId: context.workspaceId,
    projectId: context.projectId,
    boardId: context.boardId,
  });

  if (!task) {
    throw new AppError(404, "Task not found");
  }
};

export const createComment = async (
  context: CommentContext,
  userId: string,
  content: string,
) => {
  await ensureTaskExists(context);

  return Comment.create({
    ...context,
    authorId: userId,
    content,
  });
};

export const getTaskComments = async (context: CommentContext) => {
  await ensureTaskExists(context);

  return Comment.find(context)
    .sort({
      createdAt: 1,
    })
    .populate("authorId", "name email")
    .lean();
};

export const updateComment = async (
  context: CommentContext,
  commentId: string,
  userId: string,
  content: string,
) => {
  validateObjectId(commentId, "commentId");

  await ensureTaskExists(context);

  const comment = await Comment.findOne({
    _id: commentId,
    ...context,
  });

  if (!comment) {
    throw new AppError(404, "Comment not found");
  }

  if (comment.authorId.toString() !== userId) {
    throw new AppError(403, "You can only edit your own comments");
  }

  comment.content = content;

  await comment.save();

  return comment;
};

export const deleteComment = async (
  context: CommentContext,
  commentId: string,
  userId: string,
  role: WorkspaceRole,
): Promise<void> => {
  validateObjectId(commentId, "commentId");

  await ensureTaskExists(context);

  const comment = await Comment.findOne({
    _id: commentId,
    ...context,
  });

  if (!comment) {
    throw new AppError(404, "Comment not found");
  }

  const isAuthor = comment.authorId.toString() === userId;

  const canModerate = role === "OWNER" || role === "ADMIN";

  if (!isAuthor && !canModerate) {
    throw new AppError(403, "You cannot delete this comment");
  }

  await Comment.deleteOne({
    _id: commentId,
    ...context,
  });
};
