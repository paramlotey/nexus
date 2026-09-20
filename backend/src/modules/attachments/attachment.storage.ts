import fs from "node:fs/promises";
import path from "node:path";

export const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads");

export const TASK_ATTACHMENT_DIRECTORY = path.join(
  UPLOAD_ROOT,
  "task-attachments",
);

export const ensureAttachmentDirectory = async (): Promise<void> => {
  await fs.mkdir(TASK_ATTACHMENT_DIRECTORY, {
    recursive: true,
  });
};

export const getAttachmentStoragePath = (storedName: string): string => {
  return path.posix.join("task-attachments", storedName);
};

export const resolveStoragePath = (storagePath: string): string => {
  const absolutePath = path.resolve(UPLOAD_ROOT, storagePath);

  const rootPrefix = `${UPLOAD_ROOT}${path.sep}`;

  if (absolutePath !== UPLOAD_ROOT && !absolutePath.startsWith(rootPrefix)) {
    throw new Error("Invalid attachment storage path");
  }

  return absolutePath;
};

export const deleteStoredFile = async (storagePath: string): Promise<void> => {
  const absolutePath = resolveStoragePath(storagePath);

  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return;
    }

    throw error;
  }
};

export const deleteStoredFiles = async (
  storagePaths: string[],
): Promise<void> => {
  await Promise.allSettled(
    storagePaths.map((storagePath) => deleteStoredFile(storagePath)),
  );
};
