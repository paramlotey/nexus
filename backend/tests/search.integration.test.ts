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
  token: string,
  name: string,
  description?: string,
) => {
  const response = await request(app)
    .post(`/api/workspaces/${workspaceId}/projects`)
    .set("Authorization", `Bearer ${token}`)
    .send({
      name,
      ...(description !== undefined ? { description } : {}),
    });

  expect(response.status).toBe(201);
  return response.body.data;
};

const createBoard = async (
  workspaceId: string,
  projectId: string,
  token: string,
  name: string,
) => {
  const response = await request(app)
    .post(`/api/workspaces/${workspaceId}/projects/${projectId}/boards`)
    .set("Authorization", `Bearer ${token}`)
    .send({ name });

  expect(response.status).toBe(201);
  return response.body.data;
};

const createColumn = async (
  workspaceId: string,
  projectId: string,
  boardId: string,
  token: string,
) => {
  const response = await request(app)
    .post(
      `/api/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns`,
    )
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "TODO" });

  expect(response.status).toBe(201);
  return response.body.data;
};

const createTask = async (
  workspaceId: string,
  projectId: string,
  boardId: string,
  columnId: string,
  token: string,
  title: string,
  description?: string,
) => {
  const response = await request(app)
    .post(
      `/api/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/tasks`,
    )
    .set("Authorization", `Bearer ${token}`)
    .send({
      columnId,
      title,
      ...(description !== undefined ? { description } : {}),
    });

  expect(response.status).toBe(201);
  return response.body.data;
};

const createComment = async (
  workspaceId: string,
  projectId: string,
  boardId: string,
  taskId: string,
  token: string,
  content: string,
) => {
  const response = await request(app)
    .post(
      `/api/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/tasks/${taskId}/comments`,
    )
    .set("Authorization", `Bearer ${token}`)
    .send({ content });

  expect(response.status).toBe(201);
  return response.body.data;
};

const setupSearchData = async () => {
  const owner = await registerUser("Search Owner", "owner@test.com");
  const workspace = await createWorkspace(
    owner.accessToken,
    "Search Workspace",
  );
  const project = await createProject(
    workspace._id,
    owner.accessToken,
    "Authentication Platform",
    "Security and login features",
  );
  const board = await createBoard(
    workspace._id,
    project._id,
    owner.accessToken,
    "Authentication Development",
  );
  const column = await createColumn(
    workspace._id,
    project._id,
    board._id,
    owner.accessToken,
  );
  const task = await createTask(
    workspace._id,
    project._id,
    board._id,
    column._id,
    owner.accessToken,
    "Implement authentication login",
    "JWT authentication and refresh token flow",
  );

  await createComment(
    workspace._id,
    project._id,
    board._id,
    task._id,
    owner.accessToken,
    "Authentication testing is complete",
  );

  return { owner, workspace };
};

describe("Workspace Search API", () => {
  it("searches across projects, boards, tasks and comments", async () => {
    const { owner, workspace } = await setupSearchData();

    const response = await request(app)
      .get(`/api/workspaces/${workspace._id}/search?q=authentication`)
      .set("Authorization", `Bearer ${owner.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.results.projects.length).toBeGreaterThan(0);
    expect(response.body.data.results.boards.length).toBeGreaterThan(0);
    expect(response.body.data.results.tasks.length).toBeGreaterThan(0);
    expect(response.body.data.results.comments.length).toBeGreaterThan(0);
  });

  it("supports searching a single resource type", async () => {
    const { owner, workspace } = await setupSearchData();

    const response = await request(app)
      .get(
        `/api/workspaces/${workspace._id}/search?q=authentication&type=TASK`,
      )
      .set("Authorization", `Bearer ${owner.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.results.tasks.length).toBeGreaterThan(0);
    expect(response.body.data.results.projects).toEqual([]);
    expect(response.body.data.results.boards).toEqual([]);
    expect(response.body.data.results.comments).toEqual([]);
  });

  it("allows VIEWER to search readable workspace resources", async () => {
    const { owner, workspace } = await setupSearchData();
    const viewer = await registerUser("Viewer", "viewer@test.com");

    await request(app)
      .post(`/api/workspaces/${workspace._id}/members`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ email: "viewer@test.com", role: "VIEWER" })
      .expect(201);

    await request(app)
      .get(`/api/workspaces/${workspace._id}/search?q=authentication`)
      .set("Authorization", `Bearer ${viewer.accessToken}`)
      .expect(200);
  });

  it("does not expose results from another workspace", async () => {
    const { owner, workspace } = await setupSearchData();
    const outsider = await registerUser("Other Owner", "other@test.com");
    const otherWorkspace = await createWorkspace(
      outsider.accessToken,
      "Other Workspace",
    );

    await createProject(
      otherWorkspace._id,
      outsider.accessToken,
      "Authentication Secret Project",
      "Authentication content from another workspace",
    );

    const response = await request(app)
      .get(`/api/workspaces/${workspace._id}/search?q=secret`)
      .set("Authorization", `Bearer ${owner.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.results.projects).toHaveLength(0);
  });

  it("rejects an invalid short search query", async () => {
    const { owner, workspace } = await setupSearchData();

    await request(app)
      .get(`/api/workspaces/${workspace._id}/search?q=a`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .expect(400);
  });
});
