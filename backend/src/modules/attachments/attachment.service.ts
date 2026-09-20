import mongoose from "mongoose";

import { Attachment } from "./attachment.model.js";
import { Task } from "../tasks/task.model.js";

import {
  deleteStoredFile,
  getAttachmentStoragePath,
} from "./attachment.storage.js";

import { AppError } from "../../utils/app-error.js";

export interface AttachmentContext {
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

const validateContext = (context: AttachmentContext): void => {
  validateObjectId(context.workspaceId, "workspaceId");

  validateObjectId(context.projectId, "projectId");

  validateObjectId(context.boardId, "boardId");

  validateObjectId(context.taskId, "taskId");
};

const ensureTaskExists = async (context: AttachmentContext): Promise<void> => {
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

export const createAttachment = async (
  context: AttachmentContext,
  userId: string,
  file: Express.Multer.File,
) => {
  const storagePath = getAttachmentStoragePath(file.filename);

  try {
    await ensureTaskExists(context);

    return await Attachment.create({
      ...context,

      uploadedBy: userId,

      originalName: file.originalname,

      storedName: file.filename,

      storagePath,

      mimeType: file.mimetype,

      size: file.size,
    });
  } catch (error) {
    await deleteStoredFile(storagePath).catch(() => undefined);

    throw error;
  }
};

export const getTaskAttachments = async (context: AttachmentContext) => {
  await ensureTaskExists(context);

  return Attachment.find(context)
    .sort({
      createdAt: -1,
    })
    .populate("uploadedBy", "name email")
    .lean();
};

export const getAttachmentById = async (
  context: AttachmentContext,
  attachmentId: string,
) => {
  validateObjectId(attachmentId, "attachmentId");

  await ensureTaskExists(context);

  const attachment = await Attachment.findOne({
    _id: attachmentId,
    ...context,
  }).lean();

  if (!attachment) {
    throw new AppError(404, "Attachment not found");
  }

  return attachment;
};

export const deleteAttachment = async (
  context: AttachmentContext,
  attachmentId: string,
  userId: string,
  role: WorkspaceRole,
): Promise<void> => {
  validateObjectId(attachmentId, "attachmentId");

  await ensureTaskExists(context);

  const attachment = await Attachment.findOne({
    _id: attachmentId,
    ...context,
  });

  if (!attachment) {
    throw new AppError(404, "Attachment not found");
  }

  const isUploader = attachment.uploadedBy.toString() === userId;

  const canModerate = role === "OWNER" || role === "ADMIN";

  if (!isUploader && !canModerate) {
    throw new AppError(403, "You cannot delete this attachment");
  }

  const storagePath = attachment.storagePath;

  await Attachment.deleteOne({
    _id: attachmentId,
    ...context,
  });

  await deleteStoredFile(storagePath).catch(() => undefined);
};
