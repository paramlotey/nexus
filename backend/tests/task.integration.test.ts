import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../src/app.js";
import { Task } from "../src/modules/tasks/task.model.js";

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

const createWorkspace = async (
  accessToken: string,
  name = "Task Test Workspace",
) => {
  const response = await request(app)
    .post("/api/workspaces")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ name });

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

const createProject = async (
  workspaceId: string,
  accessToken: string,
  name = "Task Test Project",
) => {
  const response = await request(app)
    .post(`/api/workspaces/${workspaceId}/projects`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      name,
      description: "Project for task tests",
    });

  expect(response.status).toBe(201);

  return response.body.data;
};

const createBoard = async (
  workspaceId: string,
  projectId: string,
  accessToken: string,
  name = "Task Test Board",
) => {
  const response = await request(app)
    .post(`/api/workspaces/${workspaceId}/projects/${projectId}/boards`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      name,
      description: "Board for task tests",
    });

  expect(response.status).toBe(201);

  return response.body.data;
};

const createColumn = async (
  workspaceId: string,
  projectId: string,
  boardId: string,
  accessToken: string,
  name: string,
) => {
  const response = await request(app)
    .post(
      `/api/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/columns`,
    )
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      name,
    });

  expect(response.status).toBe(201);

  return response.body.data;
};

interface CreateTaskOptions {
  title?: string;
  description?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  assigneeIds?: string[];
}

const createTask = async (
  workspaceId: string,
  projectId: string,
  boardId: string,
  columnId: string,
  accessToken: string,
  options: CreateTaskOptions = {},
) => {
  return request(app)
    .post(
      `/api/workspaces/${workspaceId}/projects/${projectId}/boards/${boardId}/tasks`,
    )
    .set("Authorization", `Bearer ${accessToken}`)
    .send({
      columnId,
      title: options.title ?? "Test Task",
      description: options.description ?? "Task integration test",
      priority: options.priority ?? "MEDIUM",
      assigneeIds: options.assigneeIds ?? [],
    });
};

const setupBoard = async () => {
  const owner = await registerUser("Owner", "owner@test.com");

  const workspace = await createWorkspace(owner.accessToken);

  const project = await createProject(workspace._id, owner.accessToken);

  const board = await createBoard(
    workspace._id,
    project._id,
    owner.accessToken,
  );

  return {
    owner,
    workspace,
    project,
    board,
  };
};

describe("Task API", () => {
  it("creates, lists, gets, updates and deletes a task", async () => {
    const { owner, workspace, project, board } = await setupBoard();

    const member = await registerUser("Member", "member@test.com");

    await addWorkspaceMember(
      workspace._id,
      owner.accessToken,
      "member@test.com",
      "MEMBER",
    );

    const column = await createColumn(
      workspace._id,
      project._id,
      board._id,
      owner.accessToken,
      "TODO",
    );

    const createResponse = await createTask(
      workspace._id,
      project._id,
      board._id,
      column._id,
      owner.accessToken,
      {
        title: "Implement login page",
        description: "Build login form and validation",
        priority: "HIGH",
        assigneeIds: [member.userId],
      },
    );

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.title).toBe("Implement login page");

    expect(createResponse.body.data.priority).toBe("HIGH");

    expect(createResponse.body.data.position).toBe(0);

    const taskId = createResponse.body.data._id;

    const listResponse = await request(app)
      .get(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks`,
      )
      .set("Authorization", `Bearer ${owner.accessToken}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(1);

    const getResponse = await request(app)
      .get(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks/${taskId}`,
      )
      .set("Authorization", `Bearer ${owner.accessToken}`);

    expect(getResponse.status).toBe(200);

    expect(getResponse.body.data._id).toBe(taskId);

    const updateResponse = await request(app)
      .patch(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks/${taskId}`,
      )
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        title: "Implement secure login page",
        priority: "URGENT",
      });

    expect(updateResponse.status).toBe(200);

    expect(updateResponse.body.data.title).toBe("Implement secure login page");

    expect(updateResponse.body.data.priority).toBe("URGENT");

    const deleteResponse = await request(app)
      .delete(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks/${taskId}`,
      )
      .set("Authorization", `Bearer ${owner.accessToken}`);

    expect(deleteResponse.status).toBe(204);

    expect(
      await Task.countDocuments({
        _id: taskId,
      }),
    ).toBe(0);
  });

  it("rejects assignees who are not workspace members", async () => {
    const { owner, workspace, project, board } = await setupBoard();

    const outsider = await registerUser("Outsider", "outsider@test.com");

    const column = await createColumn(
      workspace._id,
      project._id,
      board._id,
      owner.accessToken,
      "TODO",
    );

    const response = await createTask(
      workspace._id,
      project._id,
      board._id,
      column._id,
      owner.accessToken,
      {
        title: "Invalid assignment",
        assigneeIds: [outsider.userId],
      },
    );

    expect(response.status).toBe(400);

    expect(response.body.message).toBe(
      "One or more assignees are not workspace members",
    );
  });

  it("keeps VIEWER task access read only", async () => {
    const { owner, workspace, project, board } = await setupBoard();

    const viewer = await registerUser("Viewer", "viewer@test.com");

    await addWorkspaceMember(
      workspace._id,
      owner.accessToken,
      "viewer@test.com",
      "VIEWER",
    );

    const column = await createColumn(
      workspace._id,
      project._id,
      board._id,
      owner.accessToken,
      "TODO",
    );

    const ownerTask = await createTask(
      workspace._id,
      project._id,
      board._id,
      column._id,
      owner.accessToken,
      {
        title: "Owner Task",
      },
    );

    expect(ownerTask.status).toBe(201);

    const taskId = ownerTask.body.data._id;

    const listResponse = await request(app)
      .get(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks`,
      )
      .set("Authorization", `Bearer ${viewer.accessToken}`);

    expect(listResponse.status).toBe(200);

    const getResponse = await request(app)
      .get(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks/${taskId}`,
      )
      .set("Authorization", `Bearer ${viewer.accessToken}`);

    expect(getResponse.status).toBe(200);

    const createResponse = await createTask(
      workspace._id,
      project._id,
      board._id,
      column._id,
      viewer.accessToken,
      {
        title: "Viewer Task",
      },
    );

    expect(createResponse.status).toBe(403);

    const updateResponse = await request(app)
      .patch(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks/${taskId}`,
      )
      .set("Authorization", `Bearer ${viewer.accessToken}`)
      .send({
        title: "Should fail",
      });

    expect(updateResponse.status).toBe(403);

    const moveResponse = await request(app)
      .patch(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks/${taskId}/move`,
      )
      .set("Authorization", `Bearer ${viewer.accessToken}`)
      .send({
        targetColumnId: column._id,
        position: 0,
      });

    expect(moveResponse.status).toBe(403);

    const deleteResponse = await request(app)
      .delete(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks/${taskId}`,
      )
      .set("Authorization", `Bearer ${viewer.accessToken}`);

    expect(deleteResponse.status).toBe(403);
  });

  it("reorders tasks within the same column", async () => {
    const { owner, workspace, project, board } = await setupBoard();

    const column = await createColumn(
      workspace._id,
      project._id,
      board._id,
      owner.accessToken,
      "TODO",
    );

    const taskA = await createTask(
      workspace._id,
      project._id,
      board._id,
      column._id,
      owner.accessToken,
      {
        title: "Task A",
      },
    );

    const taskB = await createTask(
      workspace._id,
      project._id,
      board._id,
      column._id,
      owner.accessToken,
      {
        title: "Task B",
      },
    );

    const taskC = await createTask(
      workspace._id,
      project._id,
      board._id,
      column._id,
      owner.accessToken,
      {
        title: "Task C",
      },
    );

    expect(taskA.body.data.position).toBe(0);

    expect(taskB.body.data.position).toBe(1);

    expect(taskC.body.data.position).toBe(2);

    const moveResponse = await request(app)
      .patch(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks/${taskC.body.data._id}/move`,
      )
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        targetColumnId: column._id,
        position: 0,
      });

    expect(moveResponse.status).toBe(200);

    const listResponse = await request(app)
      .get(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks`,
      )
      .set("Authorization", `Bearer ${owner.accessToken}`);

    expect(listResponse.status).toBe(200);

    const tasks = listResponse.body.data;

    expect(tasks.map((task: { title: string }) => task.title)).toEqual([
      "Task C",
      "Task A",
      "Task B",
    ]);

    expect(tasks.map((task: { position: number }) => task.position)).toEqual([
      0, 1, 2,
    ]);
  });

  it("moves tasks between columns and maintains positions", async () => {
    const { owner, workspace, project, board } = await setupBoard();

    const todo = await createColumn(
      workspace._id,
      project._id,
      board._id,
      owner.accessToken,
      "TODO",
    );

    const progress = await createColumn(
      workspace._id,
      project._id,
      board._id,
      owner.accessToken,
      "IN PROGRESS",
    );

    const taskA = await createTask(
      workspace._id,
      project._id,
      board._id,
      todo._id,
      owner.accessToken,
      {
        title: "Task A",
      },
    );

    const taskB = await createTask(
      workspace._id,
      project._id,
      board._id,
      todo._id,
      owner.accessToken,
      {
        title: "Task B",
      },
    );

    const taskD = await createTask(
      workspace._id,
      project._id,
      board._id,
      progress._id,
      owner.accessToken,
      {
        title: "Task D",
      },
    );

    expect(taskA.status).toBe(201);
    expect(taskB.status).toBe(201);
    expect(taskD.status).toBe(201);

    const moveResponse = await request(app)
      .patch(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks/${taskB.body.data._id}/move`,
      )
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        targetColumnId: progress._id,
        position: 0,
      });

    expect(moveResponse.status).toBe(200);

    expect(moveResponse.body.data.columnId).toBe(progress._id);

    expect(moveResponse.body.data.position).toBe(0);

    const listResponse = await request(app)
      .get(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks`,
      )
      .set("Authorization", `Bearer ${owner.accessToken}`);

    expect(listResponse.status).toBe(200);

    const tasks = listResponse.body.data as Array<{
      title: string;
      columnId: string;
      position: number;
    }>;

    const todoTasks = tasks
      .filter((task) => task.columnId === todo._id)
      .sort((a, b) => a.position - b.position);

    const progressTasks = tasks
      .filter((task) => task.columnId === progress._id)
      .sort((a, b) => a.position - b.position);

    expect(todoTasks).toEqual([
      expect.objectContaining({
        title: "Task A",
        position: 0,
      }),
    ]);

    expect(
      progressTasks.map((task) => ({
        title: task.title,
        position: task.position,
      })),
    ).toEqual([
      {
        title: "Task B",
        position: 0,
      },
      {
        title: "Task D",
        position: 1,
      },
    ]);
  });

  it("deleting a column also deletes its tasks", async () => {
    const { owner, workspace, project, board } = await setupBoard();

    const column = await createColumn(
      workspace._id,
      project._id,
      board._id,
      owner.accessToken,
      "TODO",
    );

    await createTask(
      workspace._id,
      project._id,
      board._id,
      column._id,
      owner.accessToken,
      {
        title: "Task A",
      },
    );

    await createTask(
      workspace._id,
      project._id,
      board._id,
      column._id,
      owner.accessToken,
      {
        title: "Task B",
      },
    );

    expect(
      await Task.countDocuments({
        columnId: column._id,
      }),
    ).toBe(2);

    const deleteResponse = await request(app)
      .delete(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/columns/${column._id}`,
      )
      .set("Authorization", `Bearer ${owner.accessToken}`);

    expect(deleteResponse.status).toBe(204);

    expect(
      await Task.countDocuments({
        columnId: column._id,
      }),
    ).toBe(0);
  });
});
