import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../src/app.js";

describe("API rate limiting", () => {
  it("publishes standard rate-limit headers for API and auth routes", async () => {
    const apiResponse = await request(app).get("/api/health");
    const authResponse = await request(app).post("/api/auth/login").send({
      email: "missing@test.com",
      password: "Password@123",
    });

    expect(apiResponse.status).toBe(200);
    expect(apiResponse.headers.ratelimit).toBeDefined();
    expect(authResponse.status).toBe(401);
    expect(authResponse.headers.ratelimit).toBeDefined();

    const additionalAttempts = await Promise.all(
      Array.from({ length: 50 }, () =>
        request(app).post("/api/auth/login").send({
          email: "missing@test.com",
          password: "Password@123",
        }),
      ),
    );
    const rejectedResponse = additionalAttempts.find(
      (response) => response.status === 429,
    );

    expect(rejectedResponse?.body).toEqual({
      success: false,
      message: "Too many authentication attempts. Please try again later.",
    });
  });
});
