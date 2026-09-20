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

  return {
    userId: response.body.data.user.id as string,
    accessToken: response.body.data.accessToken as string,
  };
};

const createWorkspace = async (
  accessToken: string,
  name = "Project Test Workspace",
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
  name = "Website Redesign",
) => {
  return request(app)
    .post(`/api/workspaces/${workspaceId}/projects`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      name,
      description: "Project integration test",
    });
};

describe("Project API", () => {
  it("allows owner to create, list and get projects", async () => {
    const owner = await registerUser("Owner", "owner@test.com");

    const workspace = await createWorkspace(owner.accessToken);

    const createResponse = await createProject(
      workspace._id,
      owner.accessToken,
    );

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.name).toBe("Website Redesign");

    const projectId = createResponse.body.data._id;

    const listResponse = await request(app)
      .get(`/api/workspaces/${workspace._id}/projects`)
      .set("Authorization", `Bearer ${owner.accessToken}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(1);

    const getResponse = await request(app)
      .get(`/api/workspaces/${workspace._id}/projects/${projectId}`)
      .set("Authorization", `Bearer ${owner.accessToken}`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.data._id).toBe(projectId);
  });

  it("allows member to create and update but not delete projects", async () => {
    const owner = await registerUser("Owner", "owner@test.com");

    const member = await registerUser("Member", "member@test.com");

    const workspace = await createWorkspace(owner.accessToken);

    await addMember(
      workspace._id,
      owner.accessToken,
      "member@test.com",
      "MEMBER",
    );

    const createResponse = await createProject(
      workspace._id,
      member.accessToken,
      "Member Project",
    );

    expect(createResponse.status).toBe(201);

    const projectId = createResponse.body.data._id;

    const updateResponse = await request(app)
      .patch(`/api/workspaces/${workspace._id}/projects/${projectId}`)
      .set("Authorization", `Bearer ${member.accessToken}`)
      .send({
        name: "Updated Member Project",
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.name).toBe("Updated Member Project");

    const deleteResponse = await request(app)
      .delete(`/api/workspaces/${workspace._id}/projects/${projectId}`)
      .set("Authorization", `Bearer ${member.accessToken}`);

    expect(deleteResponse.status).toBe(403);
  });

  it("keeps viewer access read only", async () => {
    const owner = await registerUser("Owner", "owner@test.com");

    const viewer = await registerUser("Viewer", "viewer@test.com");

    const workspace = await createWorkspace(owner.accessToken);

    await addMember(
      workspace._id,
      owner.accessToken,
      "viewer@test.com",
      "VIEWER",
    );

    const projectResponse = await createProject(
      workspace._id,
      owner.accessToken,
    );

    const projectId = projectResponse.body.data._id;

    const listResponse = await request(app)
      .get(`/api/workspaces/${workspace._id}/projects`)
      .set("Authorization", `Bearer ${viewer.accessToken}`);

    expect(listResponse.status).toBe(200);

    const getResponse = await request(app)
      .get(`/api/workspaces/${workspace._id}/projects/${projectId}`)
      .set("Authorization", `Bearer ${viewer.accessToken}`);

    expect(getResponse.status).toBe(200);

    const createResponse = await createProject(
      workspace._id,
      viewer.accessToken,
      "Viewer Project",
    );

    expect(createResponse.status).toBe(403);

    const updateResponse = await request(app)
      .patch(`/api/workspaces/${workspace._id}/projects/${projectId}`)
      .set("Authorization", `Bearer ${viewer.accessToken}`)
      .send({
        name: "Should Fail",
      });

    expect(updateResponse.status).toBe(403);

    const deleteResponse = await request(app)
      .delete(`/api/workspaces/${workspace._id}/projects/${projectId}`)
      .set("Authorization", `Bearer ${viewer.accessToken}`);

    expect(deleteResponse.status).toBe(403);
  });

  it("allows admin to delete a project", async () => {
    const owner = await registerUser("Owner", "owner@test.com");

    const admin = await registerUser("Admin", "admin@test.com");

    const workspace = await createWorkspace(owner.accessToken);

    await addMember(
      workspace._id,
      owner.accessToken,
      "admin@test.com",
      "ADMIN",
    );

    const projectResponse = await createProject(
      workspace._id,
      owner.accessToken,
    );

    const projectId = projectResponse.body.data._id;

    const deleteResponse = await request(app)
      .delete(`/api/workspaces/${workspace._id}/projects/${projectId}`)
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(deleteResponse.status).toBe(204);
  });

  it("validates project ids and patch payloads", async () => {
    const owner = await registerUser("Owner", "owner@test.com");

    const workspace = await createWorkspace(owner.accessToken);

    const invalidIdResponse = await request(app)
      .get(`/api/workspaces/${workspace._id}/projects/abc`)
      .set("Authorization", `Bearer ${owner.accessToken}`);

    expect(invalidIdResponse.status).toBe(400);

    const missingResponse = await request(app)
      .get(`/api/workspaces/${workspace._id}/projects/64b7f8a12345678901234567`)
      .set("Authorization", `Bearer ${owner.accessToken}`);

    expect(missingResponse.status).toBe(404);

    const projectResponse = await createProject(
      workspace._id,
      owner.accessToken,
    );

    const emptyPatchResponse = await request(app)
      .patch(
        `/api/workspaces/${workspace._id}/projects/${projectResponse.body.data._id}`,
      )
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({});

    expect(emptyPatchResponse.status).toBe(400);
  });

  it("prevents cross-workspace project access", async () => {
    const owner = await registerUser("Owner", "owner@test.com");

    const workspaceA = await createWorkspace(owner.accessToken, "Workspace A");

    const workspaceB = await createWorkspace(owner.accessToken, "Workspace B");

    const projectResponse = await createProject(
      workspaceA._id,
      owner.accessToken,
      "Workspace A Project",
    );

    const projectId = projectResponse.body.data._id;

    const response = await request(app)
      .get(`/api/workspaces/${workspaceB._id}/projects/${projectId}`)
      .set("Authorization", `Bearer ${owner.accessToken}`);

    expect(response.status).toBe(404);
  });
});
