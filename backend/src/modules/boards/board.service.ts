import mongoose from "mongoose";

import { Board } from "./board.model.js";
import { Project } from "../projects/project.model.js";
import { AppError } from "../../utils/app-error.js";
import { Column } from "../columns/column.model.js";

interface CreateBoardInput {
  workspaceId: string;
  projectId: string;
  name: string;
  description?: string;
  userId: string;
}

interface UpdateBoardInput {
  workspaceId: string;
  projectId: string;
  boardId: string;
  name?: string;
  description?: string;
}

const validateObjectId = (value: string, field: string): void => {
  if (!mongoose.isValidObjectId(value)) {
    throw new AppError(400, `Invalid ${field}`);
  }
};

const ensureProjectBelongsToWorkspace = async (
  workspaceId: string,
  projectId: string,
): Promise<void> => {
  validateObjectId(workspaceId, "workspaceId");
  validateObjectId(projectId, "projectId");

  const projectExists = await Project.exists({
    _id: projectId,
    workspaceId,
  });

  if (!projectExists) {
    throw new AppError(404, "Project not found");
  }
};

export const createBoard = async ({
  workspaceId,
  projectId,
  name,
  description,
  userId,
}: CreateBoardInput) => {
  await ensureProjectBelongsToWorkspace(workspaceId, projectId);

  return Board.create({
    workspaceId,
    projectId,
    name,
    ...(description !== undefined && { description }),
    createdBy: userId,
  });
};

export const getProjectBoards = async (
  workspaceId: string,
  projectId: string,
) => {
  await ensureProjectBelongsToWorkspace(workspaceId, projectId);

  return Board.find({
    workspaceId,
    projectId,
  })
    .sort({ createdAt: -1 })
    .lean();
};

export const getBoardById = async (
  workspaceId: string,
  projectId: string,
  boardId: string,
) => {
  validateObjectId(boardId, "boardId");

  await ensureProjectBelongsToWorkspace(workspaceId, projectId);

  const board = await Board.findOne({
    _id: boardId,
    workspaceId,
    projectId,
  }).lean();

  if (!board) {
    throw new AppError(404, "Board not found");
  }

  return board;
};

export const updateBoard = async ({
  workspaceId,
  projectId,
  boardId,
  name,
  description,
}: UpdateBoardInput) => {
  validateObjectId(boardId, "boardId");

  await ensureProjectBelongsToWorkspace(workspaceId, projectId);

  const board = await Board.findOneAndUpdate(
    {
      _id: boardId,
      workspaceId,
      projectId,
    },
    {
      $set: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && {
          description,
        }),
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
    },
  );

  if (!board) {
    throw new AppError(404, "Board not found");
  }

  return board;
};

export const deleteBoard = async (
  workspaceId: string,
  projectId: string,
  boardId: string,
): Promise<void> => {
  validateObjectId(boardId, "boardId");

  await ensureProjectBelongsToWorkspace(workspaceId, projectId);

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const board = await Board.findOne({
        _id: boardId,
        workspaceId,
        projectId,
      }).session(session);

      if (!board) {
        throw new AppError(404, "Board not found");
      }

      await Column.deleteMany({
        workspaceId,
        projectId,
        boardId,
      }).session(session);

      await Board.deleteOne({
        _id: boardId,
        workspaceId,
        projectId,
      }).session(session);
    });
  } finally {
    await session.endSession();
  }
};
