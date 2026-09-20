import mongoose from "mongoose";

import { Board } from "../boards/board.model.js";
import { Column } from "./column.model.js";
import { AppError } from "../../utils/app-error.js";
import { deleteColumnTree } from "../../services/resource-cleanup.service.js";
import { deleteStoredFiles } from "../attachments/attachment.storage.js";

interface ColumnContext {
  workspaceId: string;
  projectId: string;
  boardId: string;
}

interface CreateColumnInput extends ColumnContext {
  name: string;
}

interface UpdateColumnInput extends ColumnContext {
  columnId: string;
  name: string;
}

const validateObjectId = (value: string, field: string): void => {
  if (!mongoose.isValidObjectId(value)) {
    throw new AppError(400, `Invalid ${field}`);
  }
};

const ensureBoardExists = async ({
  workspaceId,
  projectId,
  boardId,
}: ColumnContext): Promise<void> => {
  validateObjectId(workspaceId, "workspaceId");
  validateObjectId(projectId, "projectId");
  validateObjectId(boardId, "boardId");

  const boardExists = await Board.exists({
    _id: boardId,
    workspaceId,
    projectId,
  });

  if (!boardExists) {
    throw new AppError(404, "Board not found");
  }
};

export const createColumn = async ({
  workspaceId,
  projectId,
  boardId,
  name,
}: CreateColumnInput) => {
  await ensureBoardExists({
    workspaceId,
    projectId,
    boardId,
  });

  const lastColumn = await Column.findOne({
    workspaceId,
    projectId,
    boardId,
  })
    .sort({ position: -1 })
    .select("position")
    .lean();

  const position = lastColumn ? lastColumn.position + 1 : 0;

  return Column.create({
    workspaceId,
    projectId,
    boardId,
    name,
    position,
  });
};

export const getBoardColumns = async (context: ColumnContext) => {
  await ensureBoardExists(context);

  return Column.find(context).sort({ position: 1 }).lean();
};

export const updateColumn = async ({
  workspaceId,
  projectId,
  boardId,
  columnId,
  name,
}: UpdateColumnInput) => {
  validateObjectId(columnId, "columnId");

  await ensureBoardExists({
    workspaceId,
    projectId,
    boardId,
  });

  const column = await Column.findOneAndUpdate(
    {
      _id: columnId,
      workspaceId,
      projectId,
      boardId,
    },
    {
      $set: { name },
    },
    {
      returnDocument: "after",
      runValidators: true,
    },
  );

  if (!column) {
    throw new AppError(404, "Column not found");
  }

  return column;
};

export const deleteColumn = async (
  context: ColumnContext,
  columnId: string,
): Promise<void> => {
  validateObjectId(columnId, "columnId");

  await ensureBoardExists(context);

  const session = await mongoose.startSession();

  let attachmentPaths: string[] = [];

  try {
    await session.withTransaction(async () => {
      attachmentPaths = await deleteColumnTree(
        {
          ...context,
          columnId,
        },
        session,
      );
    });
  } finally {
    await session.endSession();
  }

  await deleteStoredFiles(attachmentPaths);
};

export const reorderColumns = async (
  context: ColumnContext,
  columnIds: string[],
) => {
  await ensureBoardExists(context);

  for (const columnId of columnIds) {
    validateObjectId(columnId, "columnId");
  }

  const columns = await Column.find(context).select("_id").lean();

  if (columns.length !== columnIds.length) {
    throw new AppError(
      400,
      "All board columns must be included when reordering",
    );
  }

  const existingIds = new Set(columns.map((column) => column._id.toString()));

  const invalidColumn = columnIds.some(
    (columnId) => !existingIds.has(columnId),
  );

  if (invalidColumn) {
    throw new AppError(400, "One or more columns do not belong to this board");
  }

  await Column.bulkWrite(
    columnIds.map((columnId, position) => ({
      updateOne: {
        filter: {
          _id: columnId,
          ...context,
        },
        update: {
          $set: { position },
        },
      },
    })),
  );

  return Column.find(context).sort({ position: 1 }).lean();
};
