import type { NextFunction, Request, Response } from "express";

import * as documentService from "./document.service.js";
import { recordAuditLog } from "../audit/audit.service.js";
import { AppError } from "../../utils/app-error.js";

const getRequiredParam = (req: Request, paramName: string): string => {
  const value = req.params[paramName];

  if (typeof value !== "string" || value.trim() === "") {
    throw new AppError(400, `Invalid ${paramName}`);
  }

  return value;
};

const getQueryString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

export const createDocument = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const workspaceId = getRequiredParam(req, "workspaceId");
    const document = await documentService.createDocument({
      workspaceId,
      userId: req.user.userId,
      title: req.body.title,
      content: req.body.content,
      projectId: req.body.projectId,
    });

    await recordAuditLog({
      workspaceId,
      actorId: req.user.userId,
      action: "DOCUMENT_CREATED",
      entityType: "DOCUMENT",
      entityId: document._id.toString(),
      metadata: {
        title: document.title,
        ...(document.projectId && { projectId: document.projectId.toString() }),
      },
    });

    res.status(201).json({ success: true, data: document });
  } catch (error) {
    next(error);
  }
};

export const listDocuments = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = getQueryString(req.query.page);
    const limit = getQueryString(req.query.limit);
    const projectId = getQueryString(req.query.projectId);
    const result = await documentService.listDocuments({
      workspaceId: getRequiredParam(req, "workspaceId"),
      ...(page !== undefined && { page: Number(page) }),
      ...(limit !== undefined && { limit: Number(limit) }),
      ...(projectId !== undefined && { projectId }),
    });

    res.status(200).json({
      success: true,
      data: result.documents,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const getDocumentById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const document = await documentService.getDocumentById(
      getRequiredParam(req, "workspaceId"),
      getRequiredParam(req, "documentId"),
    );

    res.status(200).json({ success: true, data: document });
  } catch (error) {
    next(error);
  }
};

export const updateDocument = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const workspaceId = getRequiredParam(req, "workspaceId");
    const document = await documentService.updateDocument({
      workspaceId,
      documentId: getRequiredParam(req, "documentId"),
      userId: req.user.userId,
      title: req.body.title,
      content: req.body.content,
    });

    await recordAuditLog({
      workspaceId,
      actorId: req.user.userId,
      action: "DOCUMENT_UPDATED",
      entityType: "DOCUMENT",
      entityId: document._id.toString(),
      metadata: { changedFields: Object.keys(req.body) },
    });

    res.status(200).json({ success: true, data: document });
  } catch (error) {
    next(error);
  }
};

export const deleteDocument = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const workspaceId = getRequiredParam(req, "workspaceId");
    const documentId = getRequiredParam(req, "documentId");
    await documentService.deleteDocument(workspaceId, documentId);

    await recordAuditLog({
      workspaceId,
      actorId: req.user.userId,
      action: "DOCUMENT_DELETED",
      entityType: "DOCUMENT",
      entityId: documentId,
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
