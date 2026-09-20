import mongoose from "mongoose";

import { Project } from "../projects/project.model.js";
import { Board } from "../boards/board.model.js";
import { Task } from "../tasks/task.model.js";
import { Comment } from "../comments/comment.model.js";
import { WorkspaceDocument } from "../documents/document.model.js";
import type { SearchEntityType } from "./search.validation.js";
import { AppError } from "../../utils/app-error.js";

interface WorkspaceSearchInput {
  workspaceId: string;
  query: string;
  type?: SearchEntityType;
  limit?: number;
}

const validateObjectId = (value: string, field: string): void => {
  if (!mongoose.isValidObjectId(value)) {
    throw new AppError(400, `Invalid ${field}`);
  }
};

const shouldSearch = (
  requestedType: SearchEntityType | undefined,
  entityType: SearchEntityType,
): boolean => requestedType === undefined || requestedType === entityType;

const searchProjects = async (
  workspaceId: mongoose.Types.ObjectId,
  query: string,
  limit: number,
) => {
  return Project.aggregate([
    {
      $match: {
        workspaceId,
        $text: { $search: query },
      },
    },
    {
      $project: {
        _id: 1,
        workspaceId: 1,
        name: 1,
        description: 1,
        createdBy: 1,
        createdAt: 1,
        updatedAt: 1,
        score: { $meta: "textScore" },
      },
    },
    { $sort: { score: -1 } },
    { $limit: limit },
  ]);
};

const searchBoards = async (
  workspaceId: mongoose.Types.ObjectId,
  query: string,
  limit: number,
) => {
  return Board.aggregate([
    {
      $match: {
        workspaceId,
        $text: { $search: query },
      },
    },
    {
      $project: {
        _id: 1,
        workspaceId: 1,
        projectId: 1,
        name: 1,
        description: 1,
        createdBy: 1,
        createdAt: 1,
        updatedAt: 1,
        score: { $meta: "textScore" },
      },
    },
    { $sort: { score: -1 } },
    { $limit: limit },
  ]);
};

const searchTasks = async (
  workspaceId: mongoose.Types.ObjectId,
  query: string,
  limit: number,
) => {
  return Task.aggregate([
    {
      $match: {
        workspaceId,
        $text: { $search: query },
      },
    },
    {
      $project: {
        _id: 1,
        workspaceId: 1,
        projectId: 1,
        boardId: 1,
        columnId: 1,
        title: 1,
        description: 1,
        priority: 1,
        position: 1,
        assigneeIds: 1,
        dueDate: 1,
        createdAt: 1,
        updatedAt: 1,
        score: { $meta: "textScore" },
      },
    },
    { $sort: { score: -1 } },
    { $limit: limit },
  ]);
};

const searchComments = async (
  workspaceId: mongoose.Types.ObjectId,
  query: string,
  limit: number,
) => {
  return Comment.aggregate([
    {
      $match: {
        workspaceId,
        $text: { $search: query },
      },
    },
    {
      $project: {
        _id: 1,
        workspaceId: 1,
        projectId: 1,
        boardId: 1,
        taskId: 1,
        authorId: 1,
        content: 1,
        createdAt: 1,
        updatedAt: 1,
        score: { $meta: "textScore" },
      },
    },
    { $sort: { score: -1 } },
    { $limit: limit },
  ]);
};

const searchDocuments = async (
  workspaceId: mongoose.Types.ObjectId,
  query: string,
  limit: number,
) => {
  return WorkspaceDocument.aggregate([
    {
      $match: {
        workspaceId,
        $text: { $search: query },
      },
    },
    {
      $project: {
        _id: 1,
        workspaceId: 1,
        projectId: 1,
        title: 1,
        content: 1,
        createdBy: 1,
        updatedBy: 1,
        createdAt: 1,
        updatedAt: 1,
        score: { $meta: "textScore" },
      },
    },
    { $sort: { score: -1 } },
    { $limit: limit },
  ]);
};

export const searchWorkspace = async ({
  workspaceId,
  query,
  type,
  limit = 10,
}: WorkspaceSearchInput) => {
  validateObjectId(workspaceId, "workspaceId");

  await Promise.all([
    Project.init(),
    Board.init(),
    Task.init(),
    Comment.init(),
    WorkspaceDocument.init(),
  ]);

  const workspaceObjectId = new mongoose.Types.ObjectId(workspaceId);

  const [projects, boards, tasks, comments, documents] = await Promise.all([
    shouldSearch(type, "PROJECT")
      ? searchProjects(workspaceObjectId, query, limit)
      : Promise.resolve([]),
    shouldSearch(type, "BOARD")
      ? searchBoards(workspaceObjectId, query, limit)
      : Promise.resolve([]),
    shouldSearch(type, "TASK")
      ? searchTasks(workspaceObjectId, query, limit)
      : Promise.resolve([]),
    shouldSearch(type, "COMMENT")
      ? searchComments(workspaceObjectId, query, limit)
      : Promise.resolve([]),
    shouldSearch(type, "DOCUMENT")
      ? searchDocuments(workspaceObjectId, query, limit)
      : Promise.resolve([]),
  ]);

  return {
    query,
    results: {
      projects,
      boards,
      tasks,
      comments,
      documents,
    },
    counts: {
      projects: projects.length,
      boards: boards.length,
      tasks: tasks.length,
      comments: comments.length,
      documents: documents.length,
    },
  };
};
