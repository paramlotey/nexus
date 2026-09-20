import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../src/app.js";

import { Comment } from "../src/modules/comments/comment.model.js";

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

const createWorkspace = async (accessToken: string) => {
  const response = await request(app)
    .post("/api/workspaces")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      name: "Comment Test Workspace",
    });

  expect(response.status).toBe(201);

  return response.body.data;
};

const addWorkspaceMember = async (
  workspaceId: string,
  ownerToken: string,
  email: string,
  role: "ADMIN" | "MEMBER" | "VIEWER",
) => {
  const response = await request(app)
    .post(`/api/workspaces/${workspaceId}/members`)
    .set("Authorization", `Bearer ${ownerToken}`)
    .send({
      email,
      role,
    });

  expect(response.status).toBe(201);

  return response.body.data;
};

const createProject = async (workspaceId: string, accessToken: string) => {
  const response = await request(app)
    .post(`/api/workspaces/${workspaceId}/projects`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      name: "Comment Test Project",
    });

  expect(response.status).toBe(201);

  return response.body.data;
};

const createBoard = async (
  workspaceId: string,
  projectId: string,
  accessToken: string,
) => {
  const response = await request(app)
    .post(`/api/workspaces/${workspaceId}/projects/${projectId}/boards`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      name: "Comment Test Board",
    });

  expect(response.status).toBe(201);

  return response.body.data;
};

const createColumn = async (
  workspaceId: string,
  projectId: string,
  boardId: string,
  accessToken: string,
) => {
  const response = await request(app)
    .post(
      `/api/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns`,
    )
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      name: "TODO",
    });

  expect(response.status).toBe(201);

  return response.body.data;
};

const createTask = async (
  workspaceId: string,
  projectId: string,
  boardId: string,
  columnId: string,
  accessToken: string,
  title = "Comment Test Task",
) => {
  const response = await request(app)
    .post(
      `/api/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/tasks`,
    )
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      columnId,
      title,
    });

  expect(response.status).toBe(201);

  return response.body.data;
};

const setupTask = async () => {
  const owner = await registerUser("Owner", "owner@test.com");

  const workspace = await createWorkspace(owner.accessToken);

  const project = await createProject(workspace._id, owner.accessToken);

  const board = await createBoard(
    workspace._id,
    project._id,
    owner.accessToken,
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
  );

  return {
    owner,
    workspace,
    project,
    board,
    column,
    task,
  };
};

const createComment = async (
  workspaceId: string,
  projectId: string,
  boardId: string,
  taskId: string,
  accessToken: string,
  content: string,
) => {
  return request(app)
    .post(
      `/api/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/tasks/${taskId}/comments`,
    )
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      content,
    });
};

describe("Comment API", () => {
  it("creates, lists, updates and deletes an own comment", async () => {
    const { owner, workspace, project, board, task } = await setupTask();

    const createResponse = await createComment(
      workspace._id,
      project._id,
      board._id,
      task._id,
      owner.accessToken,
      "Initial comment",
    );

    expect(createResponse.status).toBe(201);

    expect(createResponse.body.data.content).toBe("Initial comment");

    const commentId = createResponse.body.data._id;

    const listResponse = await request(app)
      .get(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks/${task._id}/comments`,
      )
      .set("Authorization", `Bearer ${owner.accessToken}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(1);

    expect(listResponse.body.data[0].content).toBe("Initial comment");

    const updateResponse = await request(app)
      .patch(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks/${task._id}/comments/${commentId}`,
      )
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        content: "Updated comment",
      });

    expect(updateResponse.status).toBe(200);

    expect(updateResponse.body.data.content).toBe("Updated comment");

    const deleteResponse = await request(app)
      .delete(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks/${task._id}/comments/${commentId}`,
      )
      .set("Authorization", `Bearer ${owner.accessToken}`);

    expect(deleteResponse.status).toBe(204);

    expect(
      await Comment.countDocuments({
        _id: commentId,
      }),
    ).toBe(0);
  });

  it("keeps VIEWER access read only", async () => {
    const { owner, workspace, project, board, task } = await setupTask();

    const viewer = await registerUser("Viewer", "viewer@test.com");

    await addWorkspaceMember(
      workspace._id,
      owner.accessToken,
      "viewer@test.com",
      "VIEWER",
    );

    const ownerComment = await createComment(
      workspace._id,
      project._id,
      board._id,
      task._id,
      owner.accessToken,
      "Owner comment",
    );

    expect(ownerComment.status).toBe(201);

    const listResponse = await request(app)
      .get(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks/${task._id}/comments`,
      )
      .set("Authorization", `Bearer ${viewer.accessToken}`);

    expect(listResponse.status).toBe(200);

    const createResponse = await createComment(
      workspace._id,
      project._id,
      board._id,
      task._id,
      viewer.accessToken,
      "Viewer comment",
    );

    expect(createResponse.status).toBe(403);

    const updateResponse = await request(app)
      .patch(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks/${task._id}/comments/${ownerComment.body.data._id}`,
      )
      .set("Authorization", `Bearer ${viewer.accessToken}`)
      .send({
        content: "Should fail",
      });

    expect(updateResponse.status).toBe(403);

    const deleteResponse = await request(app)
      .delete(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks/${task._id}/comments/${ownerComment.body.data._id}`,
      )
      .set("Authorization", `Bearer ${viewer.accessToken}`);

    expect(deleteResponse.status).toBe(403);
  });

  it("does not allow a member to edit or delete another member's comment", async () => {
    const { owner, workspace, project, board, task } = await setupTask();

    const memberA = await registerUser("Member A", "member-a@test.com");

    const memberB = await registerUser("Member B", "member-b@test.com");

    await addWorkspaceMember(
      workspace._id,
      owner.accessToken,
      "member-a@test.com",
      "MEMBER",
    );

    await addWorkspaceMember(
      workspace._id,
      owner.accessToken,
      "member-b@test.com",
      "MEMBER",
    );

    const commentResponse = await createComment(
      workspace._id,
      project._id,
      board._id,
      task._id,
      memberA.accessToken,
      "Member A comment",
    );

    expect(commentResponse.status).toBe(201);

    const commentId = commentResponse.body.data._id;

    const updateResponse = await request(app)
      .patch(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks/${task._id}/comments/${commentId}`,
      )
      .set("Authorization", `Bearer ${memberB.accessToken}`)
      .send({
        content: "Member B tried editing this",
      });

    expect(updateResponse.status).toBe(403);

    const deleteResponse = await request(app)
      .delete(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks/${task._id}/comments/${commentId}`,
      )
      .set("Authorization", `Bearer ${memberB.accessToken}`);

    expect(deleteResponse.status).toBe(403);

    expect(
      await Comment.countDocuments({
        _id: commentId,
      }),
    ).toBe(1);
  });

  it("allows ADMIN to delete another user's comment but not edit it", async () => {
    const { owner, workspace, project, board, task } = await setupTask();

    const admin = await registerUser("Admin", "admin@test.com");

    const member = await registerUser("Member", "member@test.com");

    await addWorkspaceMember(
      workspace._id,
      owner.accessToken,
      "admin@test.com",
      "ADMIN",
    );

    await addWorkspaceMember(
      workspace._id,
      owner.accessToken,
      "member@test.com",
      "MEMBER",
    );

    const commentResponse = await createComment(
      workspace._id,
      project._id,
      board._id,
      task._id,
      member.accessToken,
      "Member comment",
    );

    expect(commentResponse.status).toBe(201);

    const commentId = commentResponse.body.data._id;

    const updateResponse = await request(app)
      .patch(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks/${task._id}/comments/${commentId}`,
      )
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({
        content: "Admin should not rewrite member text",
      });

    expect(updateResponse.status).toBe(403);

    const deleteResponse = await request(app)
      .delete(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks/${task._id}/comments/${commentId}`,
      )
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(deleteResponse.status).toBe(204);

    expect(
      await Comment.countDocuments({
        _id: commentId,
      }),
    ).toBe(0);
  });

  it("prevents accessing a comment through another task", async () => {
    const { owner, workspace, project, board, column, task } =
      await setupTask();

    const secondTask = await createTask(
      workspace._id,
      project._id,
      board._id,
      column._id,
      owner.accessToken,
      "Second Task",
    );

    const commentResponse = await createComment(
      workspace._id,
      project._id,
      board._id,
      task._id,
      owner.accessToken,
      "First task comment",
    );

    const response = await request(app)
      .patch(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks/${secondTask._id}/comments/${commentResponse.body.data._id}`,
      )
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        content: "Should not work",
      });

    expect(response.status).toBe(404);
  });

  it("deleting a task also deletes its comments", async () => {
    const { owner, workspace, project, board, task } = await setupTask();

    await createComment(
      workspace._id,
      project._id,
      board._id,
      task._id,
      owner.accessToken,
      "Comment A",
    );

    await createComment(
      workspace._id,
      project._id,
      board._id,
      task._id,
      owner.accessToken,
      "Comment B",
    );

    expect(
      await Comment.countDocuments({
        taskId: task._id,
      }),
    ).toBe(2);

    const deleteResponse = await request(app)
      .delete(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks/${task._id}`,
      )
      .set("Authorization", `Bearer ${owner.accessToken}`);

    expect(deleteResponse.status).toBe(204);

    expect(
      await Comment.countDocuments({
        taskId: task._id,
      }),
    ).toBe(0);
  });
});
