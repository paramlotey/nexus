import { createServer, type Server as HttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import request from "supertest";
import {
  io as createSocketClient,
  type Socket as ClientSocket,
} from "socket.io-client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import app from "../src/app.js";
import {
  closeSocketServer,
  initializeSocketServer,
} from "../src/sockets/socket.server.js";
import type {
  ClientToServerEvents,
  RealtimeNotification,
  ServerToClientEvents,
  WorkspaceRoomResponse,
} from "../src/sockets/socket.types.js";

const PASSWORD = "Password@123";

type TestClient = ClientSocket<ServerToClientEvents, ClientToServerEvents>;

let httpServer: HttpServer;
let socketUrl = "";
const clients: TestClient[] = [];

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

const createClient = (token: string): TestClient => {
  const client = createSocketClient<
    ServerToClientEvents,
    ClientToServerEvents
  >(socketUrl, {
    auth: { token },
    transports: ["websocket"],
    forceNew: true,
    reconnection: false,
  });

  clients.push(client);
  return client;
};

const connectClient = async (token: string): Promise<TestClient> => {
  const client = createClient(token);

  await new Promise<void>((resolve, reject) => {
    client.once("connect", resolve);
    client.once("connect_error", reject);
  });

  return client;
};

const setupTaskContext = async () => {
  const owner = await registerUser("Owner", "owner@test.com");
  const member = await registerUser("Member", "member@test.com");

  const workspaceResponse = await request(app)
    .post("/api/workspaces")
    .set("Authorization", `Bearer ${owner.accessToken}`)
    .send({ name: "Socket Workspace" });
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
    .send({ name: "Socket Project" });
  expect(projectResponse.status).toBe(201);
  const project = projectResponse.body.data;

  const boardResponse = await request(app)
    .post(`/api/workspaces/${workspace._id}/projects/${project._id}/boards`)
    .set("Authorization", `Bearer ${owner.accessToken}`)
    .send({ name: "Socket Board" });
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

const emitWithAck = (
  client: TestClient,
  event: "workspace:join" | "workspace:leave",
  workspaceId: string,
): Promise<WorkspaceRoomResponse> => {
  return new Promise((resolve) => {
    client.emit(event, { workspaceId }, resolve);
  });
};

beforeAll(async () => {
  httpServer = createServer(app);
  initializeSocketServer(httpServer);

  await new Promise<void>((resolve) => {
    httpServer.listen(0, "127.0.0.1", resolve);
  });

  const address = httpServer.address() as AddressInfo;
  socketUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  for (const client of clients) {
    client.disconnect();
  }

  await closeSocketServer();

  if (httpServer.listening) {
    await new Promise<void>((resolve, reject) => {
      httpServer.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
});

describe("Socket.io realtime", () => {
  it("rejects an invalid access token", async () => {
    const client = createClient("invalid-token");
    const error = await new Promise<Error>((resolve) => {
      client.once("connect_error", resolve);
    });

    expect(error.message).toBe("Invalid or expired access token");
  });

  it("allows a workspace member to join and leave the workspace room", async () => {
    const { owner, workspace } = await setupTaskContext();
    const client = await connectClient(owner.accessToken);

    const joinedEvent = new Promise<{ workspaceId: string }>((resolve) => {
      client.once("workspace:joined", resolve);
    });
    const joinResponse = await emitWithAck(
      client,
      "workspace:join",
      workspace._id,
    );

    expect(joinResponse).toEqual({ success: true });
    await expect(joinedEvent).resolves.toEqual({ workspaceId: workspace._id });

    const leftEvent = new Promise<{ workspaceId: string }>((resolve) => {
      client.once("workspace:left", resolve);
    });
    const leaveResponse = await emitWithAck(
      client,
      "workspace:leave",
      workspace._id,
    );

    expect(leaveResponse).toEqual({ success: true });
    await expect(leftEvent).resolves.toEqual({ workspaceId: workspace._id });
  });

  it("prevents a non-member from joining a workspace room", async () => {
    const { workspace } = await setupTaskContext();
    const outsider = await registerUser("Outsider", "outsider@test.com");
    const client = await connectClient(outsider.accessToken);
    const response = await emitWithAck(
      client,
      "workspace:join",
      workspace._id,
    );

    expect(response).toEqual({
      success: false,
      error: "Workspace access denied",
    });
  });

  it("pushes a persisted notification to the assigned user in real time", async () => {
    const { owner, member, workspace, project, board, column } =
      await setupTaskContext();
    const memberSocket = await connectClient(member.accessToken);

    const notificationPromise = new Promise<RealtimeNotification>(
      (resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Realtime notification timeout"));
        }, 3000);

        memberSocket.once("notification:new", (notification) => {
          clearTimeout(timeout);
          resolve(notification);
        });
      },
    );

    const taskResponse = await request(app)
      .post(
        `/api/workspaces/${workspace._id}/projects/${project._id}/boards/${board._id}/tasks`,
      )
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({
        columnId: column._id,
        title: "Realtime Task",
        assigneeIds: [member.userId],
      });

    expect(taskResponse.status).toBe(201);

    const notification = await notificationPromise;
    expect(notification).toMatchObject({
      type: "TASK_ASSIGNED",
      entityId: taskResponse.body.data._id,
      userId: member.userId,
    });
    expect(notification._id).toBeTruthy();
    expect(notification.createdAt).toBeTruthy();
  });
});
