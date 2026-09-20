import path from "node:path";
import { randomUUID } from "node:crypto";

import multer from "multer";

import {
  ensureAttachmentDirectory,
  TASK_ATTACHMENT_DIRECTORY,
} from "./attachment.storage.js";

import { AppError } from "../../utils/app-error.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain",

  "application/msword",

  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

  "application/vnd.ms-excel",

  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const storage = multer.diskStorage({
  destination: async (_req, _file, callback) => {
    try {
      await ensureAttachmentDirectory();

      callback(null, TASK_ATTACHMENT_DIRECTORY);
    } catch (error) {
      callback(
        error instanceof Error
          ? error
          : new Error("Unable to prepare upload directory"),
        TASK_ATTACHMENT_DIRECTORY,
      );
    }
  },

  filename: (_req, file, callback) => {
    const extension = path
      .extname(file.originalname)
      .toLowerCase()
      .slice(0, 10);

    callback(null, `${randomUUID()}${extension}`);
  },
});

const attachmentUpload = multer({
  storage,

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },

  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new AppError(400, "Unsupported file type"));

      return;
    }

    callback(null, true);
  },
});

export const uploadSingleAttachment = (
  req: Parameters<typeof attachmentUpload.single>[0] extends never
    ? never
    : any,
  res: any,
  next: any,
): void => {
  attachmentUpload.single("file")(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        next(new AppError(400, "File exceeds the 10 MB limit"));

        return;
      }

      next(new AppError(400, error.message));

      return;
    }

    if (error) {
      next(error);
      return;
    }

    next();
  });
};
