import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../src/app.js";
import { processNotificationJob } from "../src/jobs/processors/notification.processor.js";
import { Notification } from "../src/modules/notifications/notification.model.js";

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

const setup = async () => {
  const owner = await registerUser("Owner", "owner@test.com");
  const member = await registerUser("Member", "member@test.com");

  const workspaceResponse = await request(app)
    .post("/api/workspaces")
    .set("Authorization", `Bearer ${owner.accessToken}`)
    .send({ name: "Notification Workspace" });
  expect(workspaceResponse.status).toBe(201);
  const workspace = workspaceResponse.body.data;

  await request(app)
    .post(`/api/workspaces/${workspace._id}/members`)
    .set("Authorization", `Bearer ${owner.accessToken}`)
    .send({ email: "member@test.com", role: "MEMBER" })
    .expect(201);

  const projectResponse = await request(app)
    .post(`/api/workspaces/${workspace._id}/projects`)
    .set("Authorization", `Bearer ${owner.accessToken}`)
    .send({ name: "Notification Project" });
  expect(projectResponse.status).toBe(201);
  const project = projectResponse.body.data;

  const boardResponse = await request(app)
    .post(`/api/workspaces/${workspace._id}/projects/${project._id}/boards`)
    .set("Authorization", `Bearer ${owner.accessToken}`)
    .send({ name: "Notification Board" });
  expect(boardResponse.status).toBe(201);
  const board = boardResponse.body.data;

  const columnResponse = await request(app)
    .post(
      `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/columns`,
    )
    .set("Authorization", `Bearer ${owner.accessToken}`)
    .send({ name: "TODO" });
  expect(columnResponse.status).toBe(201);

  return {
    owner,
    member,
    workspace,
    project,
    board,
    column: columnResponse.body.data,
  };
};

const assignTask = (
  context: Awaited<ReturnType<typeof setup>>,
  title: string,
) => {
  return request(app)
    .post(
      `/api/workspaces/${context.workspace._id}/projects/${context.project._id}/boards/${context.board._id}/tasks`,
    )
    .set("Authorization", `Bearer ${context.owner.accessToken}`)
    .send({
      columnId: context.column._id,
      title,
      assigneeIds: [context.member.userId],
    });
};

describe("Notification API", () => {
  it("creates a notification when a task is assigned", async () => {
    const context = await setup();
    await assignTask(context, "Assigned Task").expect(201);

    const response = await request(app)
      .get(`/api/workspaces/${context.workspace._id}/notifications`)
      .set("Authorization", `Bearer ${context.member.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      type: "TASK_ASSIGNED",
      title: "New task assigned",
      message: 'You were assigned to "Assigned Task"',
    });
    expect(response.body.unreadCount).toBe(1);
  });

  it("does not expose another user's notifications", async () => {
    const context = await setup();
    await assignTask(context, "Member Task").expect(201);

    const ownerResponse = await request(app)
      .get(`/api/workspaces/${context.workspace._id}/notifications`)
      .set("Authorization", `Bearer ${context.owner.accessToken}`);

    expect(ownerResponse.status).toBe(200);
    expect(ownerResponse.body.data).toHaveLength(0);
  });

  it("marks one notification as read", async () => {
    const context = await setup();
    await assignTask(context, "Read Task").expect(201);

    const notifications = await request(app)
      .get(`/api/workspaces/${context.workspace._id}/notifications`)
      .set("Authorization", `Bearer ${context.member.accessToken}`);
    const notificationId = notifications.body.data[0]._id as string;

    const response = await request(app)
      .patch(
        `/api/workspaces/${context.workspace._id}/notifications/${notificationId}/read`,
      )
      .set("Authorization", `Bearer ${context.member.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.readAt).toBeTruthy();

    const ownerAttempt = await request(app)
      .patch(
        `/api/workspaces/${context.workspace._id}/notifications/${notificationId}/read`,
      )
      .set("Authorization", `Bearer ${context.owner.accessToken}`);
    expect(ownerAttempt.status).toBe(404);
  });

  it("marks all notifications as read and filters unread notifications", async () => {
    const context = await setup();
    await assignTask(context, "Task One").expect(201);
    await assignTask(context, "Task Two").expect(201);

    const response = await request(app)
      .patch(`/api/workspaces/${context.workspace._id}/notifications/read-all`)
      .set("Authorization", `Bearer ${context.member.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.modifiedCount).toBe(2);

    const unreadResponse = await request(app)
      .get(
        `/api/workspaces/${context.workspace._id}/notifications?unreadOnly=true`,
      )
      .set("Authorization", `Bearer ${context.member.accessToken}`);

    expect(unreadResponse.status).toBe(200);
    expect(unreadResponse.body.data).toHaveLength(0);
    expect(unreadResponse.body.unreadCount).toBe(0);
  });

  it("processes retried and duplicate-recipient jobs idempotently", async () => {
    const workspaceId = new mongoose.Types.ObjectId().toString();
    const actorId = new mongoose.Types.ObjectId().toString();
    const recipientId = new mongoose.Types.ObjectId().toString();
    const entityId = new mongoose.Types.ObjectId().toString();
    const job = {
      eventId: "stable-event-id",
      workspaceId,
      recipientIds: [recipientId, recipientId, actorId],
      actorId,
      type: "TASK_ASSIGNED" as const,
      title: "New task assigned",
      message: "Retry-safe notification",
      entityType: "TASK" as const,
      entityId,
    };

    expect(await processNotificationJob(job)).toBe(1);
    expect(await processNotificationJob(job)).toBe(0);
    expect(await Notification.countDocuments()).toBe(1);
  });
});
