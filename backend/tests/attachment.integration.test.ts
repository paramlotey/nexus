import fs from "node:fs/promises";

import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../src/app.js";

import { Attachment } from "../src/modules/attachments/attachment.model.js";

import { resolveStoragePath } from "../src/modules/attachments/attachment.storage.js";

const PASSWORD = "Password@123";

const registerUser = async (name: string, email: string) => {
  const response = await request(app).post("/api/auth/register").send({
    name,
    email,
    password: PASSWORD,
  });

  expect(response.status).toBe(201);

  return {
    userId: response.body.data.user.id as string,
    accessToken: response.body.data.accessToken as string,
  };
};

const setupTask = async () => {
  const owner = await registerUser("Owner", "owner@test.com");

  const workspaceResponse = await request(app)
    .post("/api/workspaces")
    .set("Authorization", `Bearer ${owner.accessToken}`)
    .send({
      name: "Attachment Workspace",
    });

  expect(workspaceResponse.status).toBe(201);

  const workspace = workspaceResponse.body.data;

  const projectResponse = await request(app)
    .post(`/api/workspaces/${workspace._id}/projects`)
    .set("Authorization", `Bearer ${owner.accessToken}`)
    .send({
      name: "Attachment Project",
    });

  expect(projectResponse.status).toBe(201);

  const project = projectResponse.body.data;

  const boardResponse = await request(app)
    .post(`/api/workspaces/${workspace._id}/projects/${project._id}/boards`)
    .set("Authorization", `Bearer ${owner.accessToken}`)
    .send({
      name: "Attachment Board",
    });

  expect(boardResponse.status).toBe(201);

  const board = boardResponse.body.data;

  const columnResponse = await request(app)
    .post(
      `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/columns`,
    )
    .set("Authorization", `Bearer ${owner.accessToken}`)
    .send({
      name: "TODO",
    });

  expect(columnResponse.status).toBe(201);

  const column = columnResponse.body.data;

  const taskResponse = await request(app)
    .post(
      `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks`,
    )
    .set("Authorization", `Bearer ${owner.accessToken}`)
    .send({
      columnId: column._id,
      title: "Attachment Task",
    });

  expect(taskResponse.status).toBe(201);

  return {
    owner,
    workspace,
    project,
    board,
    column,
    task: taskResponse.body.data,
  };
};

describe("Attachment API", () => {
  it("uploads, lists and downloads an attachment", async () => {
    const { owner, workspace, project, board, task } = await setupTask();

    const uploadResponse = await request(app)
      .post(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks/${task._id}/attachments`,
      )
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .attach("file", Buffer.from("Nexus attachment test"), {
        filename: "test.txt",
        contentType: "text/plain",
      });

    expect(uploadResponse.status).toBe(201);

    expect(uploadResponse.body.data.originalName).toBe("test.txt");

    expect(uploadResponse.body.data.mimeType).toBe("text/plain");

    const attachmentId = uploadResponse.body.data._id;

    const listResponse = await request(app)
      .get(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks/${task._id}/attachments`,
      )
      .set("Authorization", `Bearer ${owner.accessToken}`);

    expect(listResponse.status).toBe(200);

    expect(listResponse.body.data).toHaveLength(1);

    const downloadResponse = await request(app)
      .get(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks/${task._id}/attachments/${attachmentId}/download`,
      )
      .set("Authorization", `Bearer ${owner.accessToken}`);

    expect(downloadResponse.status).toBe(200);

    expect(downloadResponse.headers["content-disposition"]).toContain(
      "test.txt",
    );

    const attachment = await Attachment.findById(attachmentId).lean();

    expect(attachment).not.toBeNull();

    if (attachment) {
      await fs
        .unlink(resolveStoragePath(attachment.storagePath))
        .catch(() => undefined);
    }
  });

  it("rejects unsupported file types", async () => {
    const { owner, workspace, project, board, task } = await setupTask();

    const response = await request(app)
      .post(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks/${task._id}/attachments`,
      )
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .attach("file", Buffer.from("fake executable"), {
        filename: "malware.exe",
        contentType: "application/x-msdownload",
      });

    expect(response.status).toBe(400);
  });

  it("keeps VIEWER attachment access read only", async () => {
    const { owner, workspace, project, board, task } = await setupTask();

    const viewer = await registerUser("Viewer", "viewer@test.com");

    await request(app)
      .post(`/api/workspaces/${workspace._id}/members`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        email: "viewer@test.com",
        role: "VIEWER",
      })
      .expect(201);

    const uploadResponse = await request(app)
      .post(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks/${task._id}/attachments`,
      )
      .set("Authorization", `Bearer ${viewer.accessToken}`)
      .attach("file", Buffer.from("viewer file"), {
        filename: "viewer.txt",
        contentType: "text/plain",
      });

    expect(uploadResponse.status).toBe(403);

    const listResponse = await request(app)
      .get(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks/${task._id}/attachments`,
      )
      .set("Authorization", `Bearer ${viewer.accessToken}`);

    expect(listResponse.status).toBe(200);
  });

  it("deletes attachment metadata and physical file", async () => {
    const { owner, workspace, project, board, task } = await setupTask();

    const uploadResponse = await request(app)
      .post(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks/${task._id}/attachments`,
      )
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .attach("file", Buffer.from("delete me"), {
        filename: "delete.txt",
        contentType: "text/plain",
      });

    expect(uploadResponse.status).toBe(201);

    const attachment = uploadResponse.body.data;

    const absolutePath = resolveStoragePath(attachment.storagePath);

    await expect(fs.access(absolutePath)).resolves.toBeUndefined();

    const deleteResponse = await request(app)
      .delete(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks/${task._id}/attachments/${attachment._id}`,
      )
      .set("Authorization", `Bearer ${owner.accessToken}`);

    expect(deleteResponse.status).toBe(204);

    expect(
      await Attachment.countDocuments({
        _id: attachment._id,
      }),
    ).toBe(0);

    await expect(fs.access(absolutePath)).rejects.toBeDefined();
  });

  it("deleting a task cascades attachment metadata and files", async () => {
    const { owner, workspace, project, board, task } = await setupTask();

    const uploadResponse = await request(app)
      .post(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks/${task._id}/attachments`,
      )
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .attach("file", Buffer.from("cascade attachment"), {
        filename: "cascade.txt",
        contentType: "text/plain",
      });

    expect(uploadResponse.status).toBe(201);

    const attachment = uploadResponse.body.data;

    const absolutePath = resolveStoragePath(attachment.storagePath);

    const deleteResponse = await request(app)
      .delete(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks/${task._id}`,
      )
      .set("Authorization", `Bearer ${owner.accessToken}`);

    expect(deleteResponse.status).toBe(204);

    expect(
      await Attachment.countDocuments({
        taskId: task._id,
      }),
    ).toBe(0);

    await expect(fs.access(absolutePath)).rejects.toBeDefined();
  });
});
