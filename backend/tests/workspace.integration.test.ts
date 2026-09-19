import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../src/app.js";

const password = "Password@123";

const registerUser = async (name: string, email: string) => {
  const response = await request(app).post("/api/auth/register").send({
    name,
    email,
    password,
  });

  return {
    userId: response.body.data.user.id as string,
    accessToken: response.body.data.accessToken as string,
  };
};

const createWorkspace = async (accessToken: string) => {
  const response = await request(app)
    .post("/api/workspaces")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      name: "Engineering Team",
    });

  return response;
};

describe("Workspace API", () => {
  it("creates workspace and owner membership", async () => {
    const owner = await registerUser("Owner", "owner@example.com");

    const response = await createWorkspace(owner.accessToken);

    expect(response.status).toBe(201);

    expect(response.body.data.name).toBe("Engineering Team");

    expect(response.body.data.slug).toBeTypeOf("string");

    const listResponse = await request(app)
      .get("/api/workspaces")
      .set("Authorization", `Bearer ${owner.accessToken}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(1);

    expect(listResponse.body.data[0].role).toBe("OWNER");
  });

  it("rejects workspace access without authentication", async () => {
    const response = await request(app).get("/api/workspaces");

    expect(response.status).toBe(401);
  });

  it("returns workspace details for a member", async () => {
    const owner = await registerUser("Owner", "owner@example.com");

    const member = await registerUser("Member", "member@example.com");

    const workspaceResponse = await createWorkspace(owner.accessToken);

    const workspaceId = workspaceResponse.body.data._id;

    await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        email: "member@example.com",
        role: "MEMBER",
      });

    const response = await request(app)
      .get(`/api/workspaces/${workspaceId}`)
      .set("Authorization", `Bearer ${member.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.role).toBe("MEMBER");
  });

  it("enforces workspace role permissions", async () => {
    const owner = await registerUser("Owner", "owner@example.com");

    const admin = await registerUser("Admin", "admin@example.com");

    const member = await registerUser("Member", "member@example.com");

    await registerUser("Candidate", "candidate@example.com");

    const workspaceResponse = await createWorkspace(owner.accessToken);

    const workspaceId = workspaceResponse.body.data._id;

    const adminResponse = await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        email: "admin@example.com",
        role: "ADMIN",
      });

    expect(adminResponse.status).toBe(201);

    const memberResponse = await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        email: "member@example.com",
        role: "MEMBER",
      });

    expect(memberResponse.status).toBe(201);

    const memberId = memberResponse.body.data._id;

    // ADMIN may manage MEMBER/VIEWER
    const updateResponse = await request(app)
      .patch(`/api/workspaces/${workspaceId}/members/${memberId}`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({
        role: "VIEWER",
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.role).toBe("VIEWER");

    // ADMIN may not create another ADMIN
    const adminCreatesAdmin = await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({
        email: "candidate@example.com",
        role: "ADMIN",
      });

    expect(adminCreatesAdmin.status).toBe(403);

    // MEMBER may not manage workspace users
    const memberCreatesUser = await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set("Authorization", `Bearer ${member.accessToken}`)
      .send({
        email: "candidate@example.com",
        role: "MEMBER",
      });

    expect(memberCreatesUser.status).toBe(403);
  });

  it("prevents owner removal and revokes removed member access", async () => {
    const owner = await registerUser("Owner", "owner@example.com");

    const member = await registerUser("Member", "member@example.com");

    const workspaceResponse = await createWorkspace(owner.accessToken);

    const workspaceId = workspaceResponse.body.data._id;

    const memberResponse = await request(app)
      .post(`/api/workspaces/${workspaceId}/members`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        email: "member@example.com",
        role: "MEMBER",
      });

    const memberId = memberResponse.body.data._id;

    const membersResponse = await request(app)
      .get(`/api/workspaces/${workspaceId}/members`)
      .set("Authorization", `Bearer ${owner.accessToken}`);

    const ownerMembership = membersResponse.body.data.find(
      (membership: { userId: { _id: string }; role: string }) =>
        membership.role === "OWNER",
    );

    const removeOwnerResponse = await request(app)
      .delete(`/api/workspaces/${workspaceId}/members/${ownerMembership._id}`)
      .set("Authorization", `Bearer ${owner.accessToken}`);

    expect(removeOwnerResponse.status).toBe(403);

    const removeMemberResponse = await request(app)
      .delete(`/api/workspaces/${workspaceId}/members/${memberId}`)
      .set("Authorization", `Bearer ${owner.accessToken}`);

    expect(removeMemberResponse.status).toBe(204);

    const accessResponse = await request(app)
      .get(`/api/workspaces/${workspaceId}`)
      .set("Authorization", `Bearer ${member.accessToken}`);

    expect(accessResponse.status).toBe(403);
  });
});
