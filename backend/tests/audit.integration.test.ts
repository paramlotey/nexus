import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../src/app.js";

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
      name: "Audit Test Workspace",
    });

  expect(workspaceResponse.status).toBe(201);

  const workspace = workspaceResponse.body.data;

  const projectResponse = await request(app)
    .post(`/api/workspaces/${workspace._id}/projects`)
    .set("Authorization", `Bearer ${owner.accessToken}`)
    .send({
      name: "Audit Test Project",
    });

  expect(projectResponse.status).toBe(201);

  const project = projectResponse.body.data;

  const boardResponse = await request(app)
    .post(`/api/workspaces/${workspace._id}/projects/${project._id}/boards`)
    .set("Authorization", `Bearer ${owner.accessToken}`)
    .send({
      name: "Audit Test Board",
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

  return {
    owner,
    workspace,
    project,
    board,
    column,
  };
};

describe("Audit Log API", () => {
  it("records and returns task activity with actor details", async () => {
    const { owner, workspace, project, board, column } = await setupTask();

    const taskResponse = await request(app)
      .post(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks`,
      )
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        columnId: column._id,

        title: "Audited Task",
      });

    expect(taskResponse.status).toBe(201);

    const auditResponse = await request(app)
      .get(`/api/workspaces/${workspace._id}/audit-logs`)
      .set("Authorization", `Bearer ${owner.accessToken}`);

    expect(auditResponse.status).toBe(200);

    expect(auditResponse.body.pagination.total).toBeGreaterThanOrEqual(1);

    const taskCreated = auditResponse.body.data.find(
      (log: { action: string }) => log.action === "TASK_CREATED",
    );

    expect(taskCreated).toBeDefined();

    expect(taskCreated.entityType).toBe("TASK");

    expect(taskCreated.entityId).toBe(taskResponse.body.data._id);

    expect(taskCreated.actor.email).toBe("owner@test.com");
  });

  it("supports filtering audit logs by action", async () => {
    const { owner, workspace, project, board, column } = await setupTask();

    const taskResponse = await request(app)
      .post(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks`,
      )
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        columnId: column._id,

        title: "Filtered Audit Task",
      });

    expect(taskResponse.status).toBe(201);

    const response = await request(app)
      .get(`/api/workspaces/${workspace._id}/audit-logs?action=TASK_CREATED`)
      .set("Authorization", `Bearer ${owner.accessToken}`);

    expect(response.status).toBe(200);

    expect(response.body.data.length).toBeGreaterThan(0);

    expect(
      response.body.data.every(
        (log: { action: string }) => log.action === "TASK_CREATED",
      ),
    ).toBe(true);
  });

  it("prevents MEMBER and VIEWER from reading audit logs", async () => {
    const { owner, workspace } = await setupTask();

    const member = await registerUser("Member", "member@test.com");

    const viewer = await registerUser("Viewer", "viewer@test.com");

    await request(app)
      .post(`/api/workspaces/${workspace._id}/members`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        email: "member@test.com",

        role: "MEMBER",
      })
      .expect(201);

    await request(app)
      .post(`/api/workspaces/${workspace._id}/members`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        email: "viewer@test.com",

        role: "VIEWER",
      })
      .expect(201);

    await request(app)
      .get(`/api/workspaces/${workspace._id}/audit-logs`)
      .set("Authorization", `Bearer ${member.accessToken}`)
      .expect(403);

    await request(app)
      .get(`/api/workspaces/${workspace._id}/audit-logs`)
      .set("Authorization", `Bearer ${viewer.accessToken}`)
      .expect(403);
  });

  it("allows ADMIN to read audit logs", async () => {
    const { owner, workspace } = await setupTask();

    const admin = await registerUser("Admin", "admin@test.com");

    await request(app)
      .post(`/api/workspaces/${workspace._id}/members`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        email: "admin@test.com",

        role: "ADMIN",
      })
      .expect(201);

    const response = await request(app)
      .get(`/api/workspaces/${workspace._id}/audit-logs`)
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(response.status).toBe(200);
  });
});
