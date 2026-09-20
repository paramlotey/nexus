import type { NextFunction, Request, Response } from "express";
import * as attachmentService from "./attachment.service.js";
import { resolveStoragePath } from "./attachment.storage.js";
import { AppError } from "../../utils/app-error.js";
import { recordAuditLog } from "../audit/audit.service.js";

const getRequiredParam = (req: Request, paramName: string): string => {
  const value = req.params[paramName];

  if (typeof value !== "string" || value.trim() === "") {
    throw new AppError(400, `Invalid ${paramName}`);
  }

  return value;
};

const getContext = (req: Request): attachmentService.AttachmentContext => ({
  workspaceId: getRequiredParam(req, "workspaceId"),
  projectId: getRequiredParam(req, "projectId"),
  boardId: getRequiredParam(req, "boardId"),
  taskId: getRequiredParam(req, "taskId"),
});

export const createAttachment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    if (!req.file) {
      throw new AppError(400, "File is required");
    }

    const context = getContext(req);

    const attachment = await attachmentService.createAttachment(
      context,
      req.user.userId,
      req.file,
    );

    await recordAuditLog({
      workspaceId: context.workspaceId,
      actorId: req.user.userId,
      action: "ATTACHMENT_UPLOADED",
      entityType: "ATTACHMENT",
      entityId: attachment._id.toString(),
      metadata: {
        projectId: context.projectId,
        boardId: context.boardId,
        taskId: context.taskId,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        size: attachment.size,
      },
    });

    res.status(201).json({
      success: true,
      data: attachment,
    });
  } catch (error) {
    next(error);
  }
};

export const getTaskAttachments = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const attachments = await attachmentService.getTaskAttachments(
      getContext(req),
    );

    res.status(200).json({
      success: true,
      data: attachments,
    });
  } catch (error) {
    next(error);
  }
};

export const downloadAttachment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const attachment = await attachmentService.getAttachmentById(
      getContext(req),

      getRequiredParam(req, "attachmentId"),
    );

    const absolutePath = resolveStoragePath(attachment.storagePath);

    res.download(absolutePath, attachment.originalName, (error) => {
      if (error && !res.headersSent) {
        next(new AppError(404, "Attachment file not found"));
      }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAttachment = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user || !req.workspaceMember) {
      throw new AppError(401, "Authentication required");
    }

    const context = getContext(req);
    const attachmentId = getRequiredParam(req, "attachmentId");

    await attachmentService.deleteAttachment(
      context,

      attachmentId,

      req.user.userId,

      req.workspaceMember.role,
    );

    await recordAuditLog({
      workspaceId: context.workspaceId,
      actorId: req.user.userId,
      action: "ATTACHMENT_DELETED",
      entityType: "ATTACHMENT",
      entityId: attachmentId,
      metadata: {
        projectId: context.projectId,
        boardId: context.boardId,
        taskId: context.taskId,
      },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
