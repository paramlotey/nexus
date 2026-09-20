import mongoose from "mongoose";

import { WorkspaceDocument } from "./document.model.js";
import { Project } from "../projects/project.model.js";
import { AppError } from "../../utils/app-error.js";

interface CreateDocumentInput {
  workspaceId: string;
  userId: string;
  title: string;
  content?: string;
  projectId?: string;
}

interface ListDocumentsInput {
  workspaceId: string;
  page?: number;
  limit?: number;
  projectId?: string;
}

interface UpdateDocumentInput {
  workspaceId: string;
  documentId: string;
  userId: string;
  title?: string;
  content?: string;
}

const validateObjectId = (value: string, field: string): void => {
  if (!mongoose.isValidObjectId(value)) {
    throw new AppError(400, `Invalid ${field}`);
  }
};

const ensureProjectInWorkspace = async (
  workspaceId: string,
  projectId: string,
): Promise<void> => {
  validateObjectId(projectId, "projectId");

  const projectExists = await Project.exists({ _id: projectId, workspaceId });

  if (!projectExists) {
    throw new AppError(404, "Project not found");
  }
};

export const createDocument = async ({
  workspaceId,
  userId,
  title,
  content,
  projectId,
}: CreateDocumentInput) => {
  validateObjectId(workspaceId, "workspaceId");
  validateObjectId(userId, "userId");

  if (projectId) {
    await ensureProjectInWorkspace(workspaceId, projectId);
  }

  return WorkspaceDocument.create({
    workspaceId,
    ...(projectId !== undefined && { projectId }),
    title,
    ...(content !== undefined && { content }),
    createdBy: userId,
    updatedBy: userId,
  });
};

export const listDocuments = async ({
  workspaceId,
  page = 1,
  limit = 20,
  projectId,
}: ListDocumentsInput) => {
  validateObjectId(workspaceId, "workspaceId");

  if (projectId) {
    await ensureProjectInWorkspace(workspaceId, projectId);
  }

  const filter = {
    workspaceId,
    ...(projectId !== undefined && { projectId }),
  };
  const skip = (page - 1) * limit;

  const [documents, total] = await Promise.all([
    WorkspaceDocument.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .lean(),
    WorkspaceDocument.countDocuments(filter),
  ]);

  return {
    documents,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getDocumentById = async (
  workspaceId: string,
  documentId: string,
) => {
  validateObjectId(workspaceId, "workspaceId");
  validateObjectId(documentId, "documentId");

  const document = await WorkspaceDocument.findOne({
    _id: documentId,
    workspaceId,
  })
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email")
    .lean();

  if (!document) {
    throw new AppError(404, "Document not found");
  }

  return document;
};

export const updateDocument = async ({
  workspaceId,
  documentId,
  userId,
  title,
  content,
}: UpdateDocumentInput) => {
  validateObjectId(workspaceId, "workspaceId");
  validateObjectId(documentId, "documentId");
  validateObjectId(userId, "userId");

  const document = await WorkspaceDocument.findOneAndUpdate(
    { _id: documentId, workspaceId },
    {
      $set: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        updatedBy: userId,
      },
    },
    { returnDocument: "after", runValidators: true },
  );

  if (!document) {
    throw new AppError(404, "Document not found");
  }

  return document;
};

export const deleteDocument = async (
  workspaceId: string,
  documentId: string,
): Promise<void> => {
  validateObjectId(workspaceId, "workspaceId");
  validateObjectId(documentId, "documentId");

  const document = await WorkspaceDocument.findOneAndDelete({
    _id: documentId,
    workspaceId,
  });

  if (!document) {
    throw new AppError(404, "Document not found");
  }
};
