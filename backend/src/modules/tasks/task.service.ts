import mongoose, { type ClientSession } from "mongoose";

import { Task } from "./task.model.js";
import { Column } from "../columns/column.model.js";
import { WorkspaceMember } from "../workspaces/workspace-member.model.js";
import { AppError } from "../../utils/app-error.js";
import type { TaskPriority } from "./task.model.js";
import { Comment } from "../comments/comment.model.js";
import { deleteTaskTree } from "../../services/resource-cleanup.service.js";
import { deleteStoredFiles } from "../attachments/attachment.storage.js";

interface TaskContext {
  workspaceId: string;
  projectId: string;
  boardId: string;
}

interface CreateTaskInput extends TaskContext {
  columnId: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  assigneeIds?: string[];
  dueDate?: Date;
  userId: string;
}

interface UpdateTaskInput extends TaskContext {
  taskId: string;
  title?: string;
  description?: string;
  priority?: TaskPriority;
  assigneeIds?: string[];
  dueDate?: Date | null;
}

const validateObjectId = (value: string, field: string): void => {
  if (!mongoose.isValidObjectId(value)) {
    throw new AppError(400, `Invalid ${field}`);
  }
};

const ensureColumnExists = async (
  context: TaskContext,
  columnId: string,
  session?: ClientSession,
): Promise<void> => {
  validateObjectId(columnId, "columnId");

  const query = Column.exists({
    _id: columnId,
    ...context,
  });

  if (session) {
    query.session(session);
  }

  const exists = await query;

  if (!exists) {
    throw new AppError(404, "Column not found");
  }
};

const validateAssignees = async (
  workspaceId: string,
  assigneeIds: string[],
  session?: ClientSession,
): Promise<void> => {
  if (assigneeIds.length === 0) return;

  for (const userId of assigneeIds) {
    validateObjectId(userId, "assigneeId");
  }

  const uniqueIds = [...new Set(assigneeIds)];

  const query = WorkspaceMember.countDocuments({
    workspaceId,
    userId: { $in: uniqueIds },
  });

  if (session) {
    query.session(session);
  }

  const memberCount = await query;

  if (memberCount !== uniqueIds.length) {
    throw new AppError(400, "One or more assignees are not workspace members");
  }
};

export const createTask = async (input: CreateTaskInput) => {
  const { workspaceId, projectId, boardId, columnId, assigneeIds = [] } = input;

  await ensureColumnExists({ workspaceId, projectId, boardId }, columnId);

  await validateAssignees(workspaceId, assigneeIds);

  const lastTask = await Task.findOne({
    workspaceId,
    projectId,
    boardId,
    columnId,
  })
    .sort({ position: -1 })
    .select("position")
    .lean();

  const position = lastTask ? lastTask.position + 1 : 0;

  const taskData = {
    workspaceId,
    projectId,
    boardId,
    columnId,

    title: input.title,
    ...(input.description !== undefined && { description: input.description }),
    ...(input.priority !== undefined && { priority: input.priority }),

    assigneeIds,

    ...(input.dueDate !== undefined && { dueDate: input.dueDate }),

    position,
    createdBy: input.userId,
  };

  return Task.create(taskData);
};

export const getBoardTasks = async (context: TaskContext) => {
  return Task.find(context)
    .sort({
      columnId: 1,
      position: 1,
    })
    .populate("assigneeIds", "name email")
    .lean();
};

export const getTaskById = async (context: TaskContext, taskId: string) => {
  validateObjectId(taskId, "taskId");

  const task = await Task.findOne({
    _id: taskId,
    ...context,
  })
    .populate("assigneeIds", "name email")
    .lean();

  if (!task) {
    throw new AppError(404, "Task not found");
  }

  return task;
};

export const updateTask = async ({
  workspaceId,
  projectId,
  boardId,
  taskId,
  title,
  description,
  priority,
  assigneeIds,
  dueDate,
}: UpdateTaskInput) => {
  validateObjectId(taskId, "taskId");

  if (assigneeIds !== undefined) {
    await validateAssignees(workspaceId, assigneeIds);
  }

  const task = await Task.findOneAndUpdate(
    {
      _id: taskId,
      workspaceId,
      projectId,
      boardId,
    },
    {
      $set: {
        ...(title !== undefined && { title }),

        ...(description !== undefined && {
          description,
        }),

        ...(priority !== undefined && {
          priority,
        }),

        ...(assigneeIds !== undefined && {
          assigneeIds,
        }),

        ...(dueDate !== undefined && {
          dueDate,
        }),
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
    },
  );

  if (!task) {
    throw new AppError(404, "Task not found");
  }

  return task;
};

export const deleteTask = async (
  context: TaskContext,
  taskId: string,
): Promise<void> => {
  validateObjectId(taskId, "taskId");

  const session = await mongoose.startSession();

  let attachmentPaths: string[] = [];

  try {
    await session.withTransaction(async () => {
      attachmentPaths = await deleteTaskTree(
        {
          ...context,
          taskId,
        },

        session,
      );
    });
  } finally {
    await session.endSession();
  }

  await deleteStoredFiles(attachmentPaths);
};

export const moveTask = async (
  context: TaskContext,
  taskId: string,
  targetColumnId: string,
  targetPosition: number,
) => {
  validateObjectId(taskId, "taskId");

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const task = await Task.findOne({
        _id: taskId,
        ...context,
      }).session(session);

      if (!task) {
        throw new AppError(404, "Task not found");
      }

      await ensureColumnExists(context, targetColumnId, session);

      const sourceColumnId = task.columnId.toString();

      const sameColumn = sourceColumnId === targetColumnId;

      if (sameColumn) {
        const count = await Task.countDocuments({
          ...context,
          columnId: targetColumnId,
        }).session(session);

        if (targetPosition >= count) {
          throw new AppError(400, "Invalid target position");
        }

        if (targetPosition === task.position) {
          return;
        }

        if (targetPosition < task.position) {
          await Task.updateMany(
            {
              ...context,
              columnId: targetColumnId,

              position: {
                $gte: targetPosition,
                $lt: task.position,
              },

              _id: {
                $ne: task._id,
              },
            },
            {
              $inc: {
                position: 1,
              },
            },
          ).session(session);
        } else {
          await Task.updateMany(
            {
              ...context,
              columnId: targetColumnId,

              position: {
                $gt: task.position,
                $lte: targetPosition,
              },

              _id: {
                $ne: task._id,
              },
            },
            {
              $inc: {
                position: -1,
              },
            },
          ).session(session);
        }

        task.position = targetPosition;

        await task.save({ session });

        return;
      }

      const targetCount = await Task.countDocuments({
        ...context,
        columnId: targetColumnId,
      }).session(session);

      /*
       * targetCount is allowed because it means:
       * "append to end of target column".
       */
      if (targetPosition > targetCount) {
        throw new AppError(400, "Invalid target position");
      }

      /*
       * Close gap in source column.
       */
      await Task.updateMany(
        {
          ...context,
          columnId: task.columnId,
          position: {
            $gt: task.position,
          },
        },
        {
          $inc: {
            position: -1,
          },
        },
      ).session(session);

      /*
       * Make space in target column.
       */
      await Task.updateMany(
        {
          ...context,
          columnId: targetColumnId,
          position: {
            $gte: targetPosition,
          },
        },
        {
          $inc: {
            position: 1,
          },
        },
      ).session(session);

      task.columnId = new mongoose.Types.ObjectId(targetColumnId);

      task.position = targetPosition;

      await task.save({ session });
    });
  } finally {
    await session.endSession();
  }

  return getTaskById(context, taskId);
};
