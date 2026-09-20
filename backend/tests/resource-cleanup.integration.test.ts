import fs from "node:fs/promises";

import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../src/app.js";
import { Attachment } from "../src/modules/attachments/attachment.model.js";
import { resolveStoragePath } from "../src/modules/attachments/attachment.storage.js";
import { Board } from "../src/modules/boards/board.model.js";
import { Column } from "../src/modules/columns/column.model.js";
import { Comment } from "../src/modules/comments/comment.model.js";
import { Project } from "../src/modules/projects/project.model.js";
import { Task } from "../src/modules/tasks/task.model.js";

const PASSWORD = "Password@123";

const createFixture = async () => {
  const registerResponse = await request(app).post("/api/auth/register").send({
    name: "Cleanup Owner",
    email: "cleanup-owner@test.com",
    password: PASSWORD,
  });

  expect(registerResponse.status).toBe(201);

  const accessToken = registerResponse.body.data.accessToken as string;

  const workspaceResponse = await request(app)
    .post("/api/workspaces")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ name: "Cleanup Workspace" });

  expect(workspaceResponse.status).toBe(201);

  const workspace = workspaceResponse.body.data;

  const projectResponse = await request(app)
    .post(`/api/workspaces/${workspace._id}/projects`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ name: "Cleanup Project" });

  expect(projectResponse.status).toBe(201);

  const project = projectResponse.body.data;

  const boardResponse = await request(app)
    .post(`/api/workspaces/${workspace._id}/projects/${project._id}/boards`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ name: "Cleanup Board" });

  expect(boardResponse.status).toBe(201);

  const board = boardResponse.body.data;

  const columnResponse = await request(app)
    .post(
      `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/columns`,
    )
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ name: "TODO" });

  expect(columnResponse.status).toBe(201);

  const column = columnResponse.body.data;

  const taskResponse = await request(app)
    .post(
      `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks`,
    )
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      columnId: column._id,
      title: "Cleanup Task",
    });

  expect(taskResponse.status).toBe(201);

  const task = taskResponse.body.data;

  const commentResponse = await request(app)
    .post(
      `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks/${task._id}/comments`,
    )
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ content: "Cleanup comment" });

  expect(commentResponse.status).toBe(201);

  const attachmentResponse = await request(app)
    .post(
      `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks/${task._id}/attachments`,
    )
    .set("Authorization", `Bearer ${accessToken}`)
    .attach("file", Buffer.from("cleanup attachment"), {
      filename: "cleanup.txt",
      contentType: "text/plain",
    });

  expect(attachmentResponse.status).toBe(201);

  return {
    accessToken,
    workspace,
    project,
    board,
    column,
    task,
    attachment: attachmentResponse.body.data,
  };
};

describe("Resource cleanup cascade", () => {
  it.each(["column", "board", "project"] as const)(
    "deleting a %s removes descendant collaboration data and files",
    async (target) => {
      const fixture = await createFixture();

      const {
        accessToken,
        workspace,
        project,
        board,
        column,
        task,
        attachment,
      } = fixture;

      const deletionPath =
        target === "column"
          ? `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/columns/${column._id}`
          : target === "board"
            ? `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}`
            : `/api/workspaces/${workspace._id}/projects/${project._id}`;

      const absolutePath = resolveStoragePath(attachment.storagePath);

      await expect(fs.access(absolutePath)).resolves.toBeUndefined();

      const deleteResponse = await request(app)
        .delete(deletionPath)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(deleteResponse.status).toBe(204);

      expect(await Task.countDocuments({ _id: task._id })).toBe(0);
      expect(await Comment.countDocuments({ taskId: task._id })).toBe(0);
      expect(await Attachment.countDocuments({ taskId: task._id })).toBe(0);
      await expect(fs.access(absolutePath)).rejects.toBeDefined();

      if (target === "column") {
        expect(await Column.countDocuments({ _id: column._id })).toBe(0);
      }

      if (target === "board") {
        expect(await Board.countDocuments({ _id: board._id })).toBe(0);
        expect(await Column.countDocuments({ boardId: board._id })).toBe(0);
      }

      if (target === "project") {
        expect(await Project.countDocuments({ _id: project._id })).toBe(0);
        expect(await Board.countDocuments({ projectId: project._id })).toBe(0);
        expect(await Column.countDocuments({ projectId: project._id })).toBe(0);
      }
    },
  );
});
