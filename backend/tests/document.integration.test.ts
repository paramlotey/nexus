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
  return response.body.data.accessToken as string;
};

const createWorkspace = async (accessToken: string, name: string) => {
  const response = await request(app)
    .post("/api/workspaces")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ name });

  expect(response.status).toBe(201);
  return response.body.data;
};

const createProject = async (
  workspaceId: string,
  accessToken: string,
  name: string,
) => {
  const response = await request(app)
    .post(`/api/workspaces/${workspaceId}/projects`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ name });

  expect(response.status).toBe(201);
  return response.body.data;
};

const createDocument = (
  workspaceId: string,
  accessToken: string,
  body: { title: string; content?: string; projectId?: string },
) =>
  request(app)
    .post(`/api/workspaces/${workspaceId}/documents`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send(body);

describe("Workspace Document API", () => {
  it("creates, lists, gets, updates and deletes a document with audit logs", async () => {
    const token = await registerUser("Owner", "owner@test.com");
    const workspace = await createWorkspace(token, "Document Workspace");

    const createResponse = await createDocument(workspace._id, token, {
      title: "Architecture Notes",
      content: "Initial system design",
    });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.title).toBe("Architecture Notes");
    expect(createResponse.body.data.createdBy).toBeDefined();
    expect(createResponse.body.data.updatedBy).toBeDefined();
    const documentId = createResponse.body.data._id as string;

    const listResponse = await request(app)
      .get(`/api/workspaces/${workspace._id}/documents?page=1&limit=10`)
      .set("Authorization", `Bearer ${token}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(1);
    expect(listResponse.body.pagination).toMatchObject({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
    expect(listResponse.body.data[0].createdBy.email).toBe("owner@test.com");

    const getResponse = await request(app)
      .get(`/api/workspaces/${workspace._id}/documents/${documentId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.data._id).toBe(documentId);

    const updateResponse = await request(app)
      .patch(`/api/workspaces/${workspace._id}/documents/${documentId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Updated Architecture", content: "Final design" });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.title).toBe("Updated Architecture");
    expect(updateResponse.body.data.content).toBe("Final design");

    await request(app)
      .delete(`/api/workspaces/${workspace._id}/documents/${documentId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(204);

    await request(app)
      .get(`/api/workspaces/${workspace._id}/documents/${documentId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(404);

    const auditResponse = await request(app)
      .get(`/api/workspaces/${workspace._id}/audit-logs?entityType=DOCUMENT`)
      .set("Authorization", `Bearer ${token}`);

    expect(auditResponse.status).toBe(200);
    expect(
      auditResponse.body.data.map((log: { action: string }) => log.action),
    ).toEqual(
      expect.arrayContaining([
        "DOCUMENT_CREATED",
        "DOCUMENT_UPDATED",
        "DOCUMENT_DELETED",
      ]),
    );
  });

  it("filters documents by project", async () => {
    const token = await registerUser("Owner", "owner@test.com");
    const workspace = await createWorkspace(token, "Filtered Workspace");
    const projectA = await createProject(workspace._id, token, "Project A");
    const projectB = await createProject(workspace._id, token, "Project B");

    await createDocument(workspace._id, token, {
      title: "Project A Notes",
      projectId: projectA._id,
    }).expect(201);
    await createDocument(workspace._id, token, {
      title: "Project B Notes",
      projectId: projectB._id,
    }).expect(201);
    await createDocument(workspace._id, token, {
      title: "Workspace Notes",
    }).expect(201);

    const response = await request(app)
      .get(
        `/api/workspaces/${workspace._id}/documents?projectId=${projectA._id}`,
      )
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].title).toBe("Project A Notes");
    expect(response.body.pagination.total).toBe(1);
  });

  it("keeps viewer access read only", async () => {
    const ownerToken = await registerUser("Owner", "owner@test.com");
    const viewerToken = await registerUser("Viewer", "viewer@test.com");
    const workspace = await createWorkspace(ownerToken, "Viewer Workspace");

    await request(app)
      .post(`/api/workspaces/${workspace._id}/members`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ email: "viewer@test.com", role: "VIEWER" })
      .expect(201);

    const created = await createDocument(workspace._id, ownerToken, {
      title: "Readable Notes",
    });
    const documentId = created.body.data._id as string;

    await request(app)
      .get(`/api/workspaces/${workspace._id}/documents`)
      .set("Authorization", `Bearer ${viewerToken}`)
      .expect(200);
    await request(app)
      .get(`/api/workspaces/${workspace._id}/documents/${documentId}`)
      .set("Authorization", `Bearer ${viewerToken}`)
      .expect(200);

    await createDocument(workspace._id, viewerToken, {
      title: "Forbidden",
    }).expect(403);
    await request(app)
      .patch(`/api/workspaces/${workspace._id}/documents/${documentId}`)
      .set("Authorization", `Bearer ${viewerToken}`)
      .send({ title: "Forbidden" })
      .expect(403);
    await request(app)
      .delete(`/api/workspaces/${workspace._id}/documents/${documentId}`)
      .set("Authorization", `Bearer ${viewerToken}`)
      .expect(403);
  });

  it("prevents cross-workspace document and project access", async () => {
    const token = await registerUser("Owner", "owner@test.com");
    const workspaceA = await createWorkspace(token, "Workspace A");
    const workspaceB = await createWorkspace(token, "Workspace B");
    const projectA = await createProject(workspaceA._id, token, "Project A");
    const created = await createDocument(workspaceA._id, token, {
      title: "Workspace A Notes",
      projectId: projectA._id,
    });
    const documentId = created.body.data._id as string;

    await request(app)
      .get(`/api/workspaces/${workspaceB._id}/documents/${documentId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(404);

    await createDocument(workspaceB._id, token, {
      title: "Invalid Project Scope",
      projectId: projectA._id,
    }).expect(404);
  });

  it("validates document IDs, project IDs and update payloads", async () => {
    const token = await registerUser("Owner", "owner@test.com");
    const workspace = await createWorkspace(token, "Validation Workspace");

    await request(app)
      .get(`/api/workspaces/${workspace._id}/documents/not-an-id`)
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
    await createDocument(workspace._id, token, {
      title: "Invalid project",
      projectId: "not-an-id",
    }).expect(400);

    const created = await createDocument(workspace._id, token, {
      title: "Valid Document",
    });

    await request(app)
      .patch(
        `/api/workspaces/${workspace._id}/documents/${created.body.data._id}`,
      )
      .set("Authorization", `Bearer ${token}`)
      .send({})
      .expect(400);
  });
});
