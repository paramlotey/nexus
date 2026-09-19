import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../src/app.js";

const user = {
  name: "Paramvir Singh",
  email: "paramvir@example.com",
  password: "Password@123",
};

describe("Auth API", () => {
  it("registers a new user", async () => {
    const response = await request(app).post("/api/auth/register").send(user);

    expect(response.status).toBe(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe(user.email);

    expect(response.body.data.accessToken).toBeTypeOf("string");
    expect(response.body.data.refreshToken).toBeTypeOf("string");
  });

  it("rejects duplicate registration", async () => {
    await request(app).post("/api/auth/register").send(user);

    const response = await request(app).post("/api/auth/register").send(user);

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
  });

  it("logs in with valid credentials", async () => {
    await request(app).post("/api/auth/register").send(user);

    const response = await request(app).post("/api/auth/login").send({
      email: user.email,
      password: user.password,
    });

    expect(response.status).toBe(200);
    expect(response.body.data.accessToken).toBeTypeOf("string");
    expect(response.body.data.refreshToken).toBeTypeOf("string");
  });

  it("rejects invalid password", async () => {
    await request(app).post("/api/auth/register").send(user);

    const response = await request(app).post("/api/auth/login").send({
      email: user.email,
      password: "WrongPassword123",
    });

    expect(response.status).toBe(401);
  });

  it("generates a new access token using refresh token", async () => {
    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send(user);

    const refreshToken = registerResponse.body.data.refreshToken;

    const response = await request(app)
      .post("/api/auth/refresh")
      .send({ refreshToken });

    expect(response.status).toBe(200);
    expect(response.body.data.accessToken).toBeTypeOf("string");
  });

  it("rejects an invalid refresh token", async () => {
    const response = await request(app).post("/api/auth/refresh").send({
      refreshToken: "invalid-token",
    });

    expect(response.status).toBe(401);
  });
});
