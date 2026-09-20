import type { NextFunction, Request, Response } from "express";

import { getWorkspaceAuditLogs } from "./audit.service.js";

import type { AuditAction, AuditEntityType } from "./audit.model.js";

import { AppError } from "../../utils/app-error.js";

const getRequiredParam = (req: Request, paramName: string): string => {
  const value = req.params[paramName];

  if (typeof value !== "string" || value.trim() === "") {
    throw new AppError(400, `Invalid ${paramName}`);
  }

  return value;
};

const getQueryString = (value: unknown): string | undefined => {
  return typeof value === "string" ? value : undefined;
};

export const getAuditLogs = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const pageValue = getQueryString(req.query.page);

    const limitValue = getQueryString(req.query.limit);

    const actionValue = getQueryString(req.query.action) as
      | AuditAction
      | undefined;

    const entityTypeValue = getQueryString(req.query.entityType) as
      | AuditEntityType
      | undefined;

    const actorIdValue = getQueryString(req.query.actorId);

    const result = await getWorkspaceAuditLogs({
      workspaceId: getRequiredParam(req, "workspaceId"),

      page: pageValue !== undefined ? Number(pageValue) : 1,

      limit: limitValue !== undefined ? Number(limitValue) : 20,

      ...(actionValue !== undefined ? { action: actionValue } : {}),

      ...(entityTypeValue !== undefined ? { entityType: entityTypeValue } : {}),

      ...(actorIdValue !== undefined ? { actorId: actorIdValue } : {}),
    });

    res.status(200).json({
      success: true,

      data: result.data,

      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};
