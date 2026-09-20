import type { ClientSession } from "mongoose";

import { Project } from "../modules/projects/project.model.js";
import { Board } from "../modules/boards/board.model.js";
import { Column } from "../modules/columns/column.model.js";
import { Task } from "../modules/tasks/task.model.js";
import { Comment } from "../modules/comments/comment.model.js";
import { Attachment } from "../modules/attachments/attachment.model.js";

import { AppError } from "../utils/app-error.js";

interface WorkspaceScope {
  workspaceId: string;
}

interface ProjectScope extends WorkspaceScope {
  projectId: string;
}

interface BoardScope extends ProjectScope {
  boardId: string;
}

interface ColumnScope extends BoardScope {
  columnId: string;
}

interface TaskScope extends BoardScope {
  taskId: string;
}

const getAttachmentPaths = async (
  filter: Record<string, unknown>,
  session: ClientSession,
): Promise<string[]> => {
  const attachments = await Attachment.find(filter)
    .select("storagePath")
    .session(session)
    .lean();

  return attachments.map((attachment) => attachment.storagePath);
};

export const deleteTaskTree = async (
  context: TaskScope,
  session: ClientSession,
): Promise<string[]> => {
  const task = await Task.findOne({
    _id: context.taskId,
    workspaceId: context.workspaceId,
    projectId: context.projectId,
    boardId: context.boardId,
  }).session(session);

  if (!task) {
    throw new AppError(404, "Task not found");
  }

  const attachmentPaths = await getAttachmentPaths(
    {
      workspaceId: context.workspaceId,

      projectId: context.projectId,

      boardId: context.boardId,

      taskId: context.taskId,
    },

    session,
  );

  await Comment.deleteMany({
    workspaceId: context.workspaceId,

    projectId: context.projectId,

    boardId: context.boardId,

    taskId: context.taskId,
  }).session(session);

  await Attachment.deleteMany({
    workspaceId: context.workspaceId,

    projectId: context.projectId,

    boardId: context.boardId,

    taskId: context.taskId,
  }).session(session);

  await Task.deleteOne({
    _id: context.taskId,
    workspaceId: context.workspaceId,
    projectId: context.projectId,
    boardId: context.boardId,
  }).session(session);

  await Task.updateMany(
    {
      workspaceId: context.workspaceId,

      projectId: context.projectId,

      boardId: context.boardId,

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

  return attachmentPaths;
};

export const deleteColumnTree = async (
  context: ColumnScope,
  session: ClientSession,
): Promise<string[]> => {
  const column = await Column.findOne({
    _id: context.columnId,

    workspaceId: context.workspaceId,

    projectId: context.projectId,

    boardId: context.boardId,
  }).session(session);

  if (!column) {
    throw new AppError(404, "Column not found");
  }

  const tasks = await Task.find({
    workspaceId: context.workspaceId,

    projectId: context.projectId,

    boardId: context.boardId,

    columnId: context.columnId,
  })
    .select("_id")
    .session(session)
    .lean();

  const taskIds = tasks.map((task) => task._id);

  const childFilter = {
    workspaceId: context.workspaceId,

    projectId: context.projectId,

    boardId: context.boardId,

    taskId: {
      $in: taskIds,
    },
  };

  const attachmentPaths = await getAttachmentPaths(childFilter, session);

  if (taskIds.length > 0) {
    await Comment.deleteMany(childFilter).session(session);

    await Attachment.deleteMany(childFilter).session(session);
  }

  await Task.deleteMany({
    workspaceId: context.workspaceId,

    projectId: context.projectId,

    boardId: context.boardId,

    columnId: context.columnId,
  }).session(session);

  await Column.deleteOne({
    _id: context.columnId,

    workspaceId: context.workspaceId,

    projectId: context.projectId,

    boardId: context.boardId,
  }).session(session);

  await Column.updateMany(
    {
      workspaceId: context.workspaceId,

      projectId: context.projectId,

      boardId: context.boardId,

      position: {
        $gt: column.position,
      },
    },

    {
      $inc: {
        position: -1,
      },
    },
  ).session(session);

  return attachmentPaths;
};

export const deleteBoardTree = async (
  context: BoardScope,
  session: ClientSession,
): Promise<string[]> => {
  const board = await Board.findOne({
    _id: context.boardId,
    workspaceId: context.workspaceId,
    projectId: context.projectId,
  }).session(session);

  if (!board) {
    throw new AppError(404, "Board not found");
  }

  const childFilter = {
    workspaceId: context.workspaceId,

    projectId: context.projectId,

    boardId: context.boardId,
  };

  const attachmentPaths = await getAttachmentPaths(childFilter, session);

  await Comment.deleteMany(childFilter).session(session);

  await Attachment.deleteMany(childFilter).session(session);

  await Task.deleteMany(childFilter).session(session);

  await Column.deleteMany(childFilter).session(session);

  await Board.deleteOne({
    _id: context.boardId,
    workspaceId: context.workspaceId,
    projectId: context.projectId,
  }).session(session);

  return attachmentPaths;
};

export const deleteProjectTree = async (
  context: ProjectScope,
  session: ClientSession,
): Promise<string[]> => {
  const project = await Project.findOne({
    _id: context.projectId,
    workspaceId: context.workspaceId,
  }).session(session);

  if (!project) {
    throw new AppError(404, "Project not found");
  }

  const childFilter = {
    workspaceId: context.workspaceId,

    projectId: context.projectId,
  };

  const attachmentPaths = await getAttachmentPaths(childFilter, session);

  await Comment.deleteMany(childFilter).session(session);

  await Attachment.deleteMany(childFilter).session(session);

  await Task.deleteMany(childFilter).session(session);

  await Column.deleteMany(childFilter).session(session);

  await Board.deleteMany(childFilter).session(session);

  await Project.deleteOne({
    _id: context.projectId,
    workspaceId: context.workspaceId,
  }).session(session);

  return attachmentPaths;
};
