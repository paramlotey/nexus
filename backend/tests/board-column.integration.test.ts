import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../src/app.js";
import { Column } from "../src/modules/columns/column.model.js";

const PASSWORD = "Password@123";

const registerUser = async (name: string, email: string) => {
  const response = await request(app).post("/api/auth/register").send({
    name,
    email,
    password: PASSWORD,
  });

  return {
    userId: response.body.data.user.id as string,
    accessToken: response.body.data.accessToken as string,
  };
};

const createWorkspace = async (
  accessToken: string,
  name = "Board Test Workspace",
) => {
  const response = await request(app)
    .post("/api/workspaces")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ name });

  return response.body.data;
};

const addMember = async (
  workspaceId: string,
  ownerToken: string,
  email: string,
  role: "ADMIN" | "MEMBER" | "VIEWER",
) => {
  return request(app)
    .post(`/api/workspaces/${workspaceId}/members`)
    .set("Authorization", `Bearer ${ownerToken}`)
    .send({
      email,
      role,
    });
};

const createProject = async (
  workspaceId: string,
  accessToken: string,
  name = "Board Test Project",
) => {
  const response = await request(app)
    .post(`/api/workspaces/${workspaceId}/projects`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ name });

  return response.body.data;
};

const createBoard = async (
  workspaceId: string,
  projectId: string,
  accessToken: string,
  name = "Development Board",
) => {
  return request(app)
    .post(`/api/workspaces/${workspaceId}/projects/${projectId}/boards`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      name,
      description: "Board integration test",
    });
};

const createColumn = async (
  workspaceId: string,
  projectId: string,
  boardId: string,
  accessToken: string,
  name: string,
) => {
  return request(app)
    .post(
      `/api/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns`,
    )
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ name });
};

describe("Board and Column API", () => {
  it("allows owner to create, list, get and update boards", async () => {
    const owner = await registerUser("Owner", "owner@test.com");

    const workspace = await createWorkspace(owner.accessToken);

    const project = await createProject(workspace._id, owner.accessToken);

    const createResponse = await createBoard(
      workspace._id,
      project._id,
      owner.accessToken,
    );

    expect(createResponse.status).toBe(201);

    const boardId = createResponse.body.data._id;

    const listResponse = await request(app)
      .get(`/api/workspaces/${workspace._id}/projects/${project._id}/boards`)
      .set("Authorization", `Bearer ${owner.accessToken}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(1);

    const getResponse = await request(app)
      .get(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${boardId}`,
      )
      .set("Authorization", `Bearer ${owner.accessToken}`);

    expect(getResponse.status).toBe(200);

    const updateResponse = await request(app)
      .patch(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${boardId}`,
      )
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        name: "Engineering Board",
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.name).toBe("Engineering Board");
  });

  it("enforces board RBAC for member and viewer", async () => {
    const owner = await registerUser("Owner", "owner@test.com");

    const member = await registerUser("Member", "member@test.com");

    const viewer = await registerUser("Viewer", "viewer@test.com");

    const workspace = await createWorkspace(owner.accessToken);

    const project = await createProject(workspace._id, owner.accessToken);

    await addMember(
      workspace._id,
      owner.accessToken,
      "member@test.com",
      "MEMBER",
    );

    await addMember(
      workspace._id,
      owner.accessToken,
      "viewer@test.com",
      "VIEWER",
    );

    const memberCreate = await createBoard(
      workspace._id,
      project._id,
      member.accessToken,
      "Member Board",
    );

    expect(memberCreate.status).toBe(201);

    const memberDelete = await request(app)
      .delete(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${memberCreate.body.data._id}`,
      )
      .set("Authorization", `Bearer ${member.accessToken}`);

    expect(memberDelete.status).toBe(403);

    const viewerCreate = await createBoard(
      workspace._id,
      project._id,
      viewer.accessToken,
      "Viewer Board",
    );

    expect(viewerCreate.status).toBe(403);

    const viewerList = await request(app)
      .get(`/api/workspaces/${workspace._id}/projects/${project._id}/boards`)
      .set("Authorization", `Bearer ${viewer.accessToken}`);

    expect(viewerList.status).toBe(200);
  });

  it("creates columns with sequential positions and supports reordering", async () => {
    const owner = await registerUser("Owner", "owner@test.com");

    const workspace = await createWorkspace(owner.accessToken);

    const project = await createProject(workspace._id, owner.accessToken);

    const boardResponse = await createBoard(
      workspace._id,
      project._id,
      owner.accessToken,
    );

    const boardId = boardResponse.body.data._id;

    const todo = await createColumn(
      workspace._id,
      project._id,
      boardId,
      owner.accessToken,
      "TODO",
    );

    const progress = await createColumn(
      workspace._id,
      project._id,
      boardId,
      owner.accessToken,
      "IN PROGRESS",
    );

    const review = await createColumn(
      workspace._id,
      project._id,
      boardId,
      owner.accessToken,
      "REVIEW",
    );

    expect(todo.body.data.position).toBe(0);
    expect(progress.body.data.position).toBe(1);
    expect(review.body.data.position).toBe(2);

    const reorderResponse = await request(app)
      .patch(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${boardId}/columns/reorder`,
      )
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        columnIds: [
          review.body.data._id,
          todo.body.data._id,
          progress.body.data._id,
        ],
      });

    expect(reorderResponse.status).toBe(200);

    expect(
      reorderResponse.body.data.map((column: { name: string }) => column.name),
    ).toEqual(["REVIEW", "TODO", "IN PROGRESS"]);

    expect(
      reorderResponse.body.data.map(
        (column: { position: number }) => column.position,
      ),
    ).toEqual([0, 1, 2]);
  });

  it("rejects incomplete and foreign column reorders", async () => {
    const owner = await registerUser("Owner", "owner@test.com");

    const workspace = await createWorkspace(owner.accessToken);

    const project = await createProject(workspace._id, owner.accessToken);

    const boardA = await createBoard(
      workspace._id,
      project._id,
      owner.accessToken,
      "Board A",
    );

    const boardB = await createBoard(
      workspace._id,
      project._id,
      owner.accessToken,
      "Board B",
    );

    const columnA1 = await createColumn(
      workspace._id,
      project._id,
      boardA.body.data._id,
      owner.accessToken,
      "TODO",
    );

    const columnA2 = await createColumn(
      workspace._id,
      project._id,
      boardA.body.data._id,
      owner.accessToken,
      "DONE",
    );

    const columnB = await createColumn(
      workspace._id,
      project._id,
      boardB.body.data._id,
      owner.accessToken,
      "OTHER",
    );

    const partialResponse = await request(app)
      .patch(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${boardA.body.data._id}/columns/reorder`,
      )
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        columnIds: [columnA1.body.data._id],
      });

    expect(partialResponse.status).toBe(400);

    const foreignResponse = await request(app)
      .patch(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${boardA.body.data._id}/columns/reorder`,
      )
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        columnIds: [columnA1.body.data._id, columnB.body.data._id],
      });

    expect(foreignResponse.status).toBe(400);

    // Keep TS aware this fixture was intentionally created.
    expect(columnA2.status).toBe(201);
  });

  it("closes position gaps after deleting a column", async () => {
    const owner = await registerUser("Owner", "owner@test.com");

    const workspace = await createWorkspace(owner.accessToken);

    const project = await createProject(workspace._id, owner.accessToken);

    const boardResponse = await createBoard(
      workspace._id,
      project._id,
      owner.accessToken,
    );

    const boardId = boardResponse.body.data._id;

    await createColumn(
      workspace._id,
      project._id,
      boardId,
      owner.accessToken,
      "TODO",
    );

    const progress = await createColumn(
      workspace._id,
      project._id,
      boardId,
      owner.accessToken,
      "IN PROGRESS",
    );

    await createColumn(
      workspace._id,
      project._id,
      boardId,
      owner.accessToken,
      "DONE",
    );

    const deleteResponse = await request(app)
      .delete(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${boardId}/columns/${progress.body.data._id}`,
      )
      .set("Authorization", `Bearer ${owner.accessToken}`);

    expect(deleteResponse.status).toBe(204);

    const listResponse = await request(app)
      .get(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${boardId}/columns`,
      )
      .set("Authorization", `Bearer ${owner.accessToken}`);

    expect(
      listResponse.body.data.map(
        (column: { name: string; position: number }) => ({
          name: column.name,
          position: column.position,
        }),
      ),
    ).toEqual([
      {
        name: "TODO",
        position: 0,
      },
      {
        name: "DONE",
        position: 1,
      },
    ]);
  });

  it("keeps viewer column access read only", async () => {
    const owner = await registerUser("Owner", "owner@test.com");

    const viewer = await registerUser("Viewer", "viewer@test.com");

    const workspace = await createWorkspace(owner.accessToken);

    const project = await createProject(workspace._id, owner.accessToken);

    await addMember(
      workspace._id,
      owner.accessToken,
      "viewer@test.com",
      "VIEWER",
    );

    const boardResponse = await createBoard(
      workspace._id,
      project._id,
      owner.accessToken,
    );

    const boardId = boardResponse.body.data._id;

    const ownerColumn = await createColumn(
      workspace._id,
      project._id,
      boardId,
      owner.accessToken,
      "TODO",
    );

    const listResponse = await request(app)
      .get(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${boardId}/columns`,
      )
      .set("Authorization", `Bearer ${viewer.accessToken}`);

    expect(listResponse.status).toBe(200);

    const createResponse = await createColumn(
      workspace._id,
      project._id,
      boardId,
      viewer.accessToken,
      "Viewer Column",
    );

    expect(createResponse.status).toBe(403);

    const updateResponse = await request(app)
      .patch(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${boardId}/columns/${ownerColumn.body.data._id}`,
      )
      .set("Authorization", `Bearer ${viewer.accessToken}`)
      .send({
        name: "Should Fail",
      });

    expect(updateResponse.status).toBe(403);
  });

  it("prevents cross-project board access", async () => {
    const owner = await registerUser("Owner", "owner@test.com");

    const workspace = await createWorkspace(owner.accessToken);

    const projectA = await createProject(
      workspace._id,
      owner.accessToken,
      "Project A",
    );

    const projectB = await createProject(
      workspace._id,
      owner.accessToken,
      "Project B",
    );

    const boardResponse = await createBoard(
      workspace._id,
      projectA._id,
      owner.accessToken,
    );

    const response = await request(app)
      .get(
        `/api/workspaces/${workspace._id}/projects/${projectB._id}/boards/${boardResponse.body.data._id}`,
      )
      .set("Authorization", `Bearer ${owner.accessToken}`);

    expect(response.status).toBe(404);
  });

  it("cascade deletes columns when a board is deleted", async () => {
    const owner = await registerUser("Owner", "owner@test.com");

    const workspace = await createWorkspace(owner.accessToken);

    const project = await createProject(workspace._id, owner.accessToken);

    const boardResponse = await createBoard(
      workspace._id,
      project._id,
      owner.accessToken,
      "Temporary Board",
    );

    const boardId = boardResponse.body.data._id;

    await createColumn(
      workspace._id,
      project._id,
      boardId,
      owner.accessToken,
      "TODO",
    );

    await createColumn(
      workspace._id,
      project._id,
      boardId,
      owner.accessToken,
      "DONE",
    );

    expect(await Column.countDocuments({ boardId })).toBe(2);

    const deleteResponse = await request(app)
      .delete(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${boardId}`,
      )
      .set("Authorization", `Bearer ${owner.accessToken}`);

    expect(deleteResponse.status).toBe(204);

    expect(await Column.countDocuments({ boardId })).toBe(0);
  });
});
