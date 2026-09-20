import mongoose from "mongoose";

import {
  AuditLog,
  type AuditAction,
  type AuditEntityType,
} from "./audit.model.js";

import { AppError } from "../../utils/app-error.js";

interface RecordAuditLogInput {
  workspaceId: string;
  actorId: string;

  action: AuditAction;
  entityType: AuditEntityType;

  entityId?: string;

  metadata?: Record<string, unknown>;
}

interface AuditLogFilters {
  workspaceId: string;

  page?: number;
  limit?: number;

  action?: AuditAction;
  entityType?: AuditEntityType;

  actorId?: string;
}

const validateObjectId = (value: string, field: string): void => {
  if (!mongoose.isValidObjectId(value)) {
    throw new AppError(400, `Invalid ${field}`);
  }
};

export const recordAuditLog = async (
  input: RecordAuditLogInput,
): Promise<void> => {
  try {
    await AuditLog.create({
      workspaceId: input.workspaceId,

      actorId: input.actorId,

      action: input.action,

      entityType: input.entityType,

      ...(input.entityId && {
        entityId: input.entityId,
      }),

      metadata: input.metadata ?? {},
    });
  } catch (error) {
    /*
     * Audit persistence must not cause
     * an already-successful business
     * operation to fail.
     *
     * Later BullMQ can provide retry
     * handling here.
     */
    console.error("Failed to record audit log", error);
  }
};

export const getWorkspaceAuditLogs = async ({
  workspaceId,
  page = 1,
  limit = 20,
  action,
  entityType,
  actorId,
}: AuditLogFilters) => {
  validateObjectId(workspaceId, "workspaceId");

  if (actorId) {
    validateObjectId(actorId, "actorId");
  }

  const match: Record<string, unknown> = {
    workspaceId: new mongoose.Types.ObjectId(workspaceId),
  };

  if (action) {
    match.action = action;
  }

  if (entityType) {
    match.entityType = entityType;
  }

  if (actorId) {
    match.actorId = new mongoose.Types.ObjectId(actorId);
  }

  const skip = (page - 1) * limit;

  const [result] = await AuditLog.aggregate([
    {
      $match: match,
    },

    {
      $sort: {
        createdAt: -1,
      },
    },

    {
      $facet: {
        data: [
          {
            $skip: skip,
          },

          {
            $limit: limit,
          },

          {
            $lookup: {
              from: "users",

              localField: "actorId",

              foreignField: "_id",

              as: "actor",
            },
          },

          {
            $unwind: {
              path: "$actor",

              preserveNullAndEmptyArrays: true,
            },
          },

          {
            $project: {
              _id: 1,
              workspaceId: 1,

              action: 1,
              entityType: 1,
              entityId: 1,

              metadata: 1,
              createdAt: 1,

              actor: {
                _id: "$actor._id",

                name: "$actor.name",

                email: "$actor.email",
              },
            },
          },
        ],

        total: [
          {
            $count: "count",
          },
        ],
      },
    },
  ]);

  const data = result?.data ?? [];

  const total = result?.total?.[0]?.count ?? 0;

  return {
    data,

    pagination: {
      page,
      limit,
      total,

      totalPages: Math.ceil(total / limit),
    },
  };
};
