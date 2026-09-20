import { beforeEach, describe, expect, it, vi } from "vitest";

const { getRedisClientMock } = vi.hoisted(() => ({
  getRedisClientMock: vi.fn(),
}));

vi.mock("../src/config/redis.js", () => ({
  getRedisClient: getRedisClientMock,
}));

import {
  deleteCacheKeys,
  getCachedJson,
  setCachedJson,
} from "../src/services/cache.service.js";
import {
  getProjectCacheKey,
  getWorkspaceProjectsCacheKey,
} from "../src/modules/projects/project.cache.js";

describe("cache service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads, writes and deletes JSON values when Redis is ready", async () => {
    const client = {
      status: "ready",
      get: vi.fn().mockResolvedValue('{"name":"Cached project"}'),
      set: vi.fn().mockResolvedValue("OK"),
      del: vi.fn().mockResolvedValue(2),
    };

    getRedisClientMock.mockReturnValue(client);

    await expect(
      getCachedJson<{ name: string }>("project-key"),
    ).resolves.toEqual({ name: "Cached project" });

    await setCachedJson("project-key", { name: "Project" }, 120);
    await deleteCacheKeys("project-key", "projects-key");

    expect(client.get).toHaveBeenCalledWith("project-key");
    expect(client.set).toHaveBeenCalledWith(
      "project-key",
      '{"name":"Project"}',
      "EX",
      120,
    );
    expect(client.del).toHaveBeenCalledWith("project-key", "projects-key");
  });

  it("fails open when Redis is unavailable", async () => {
    getRedisClientMock.mockReturnValue(null);

    await expect(getCachedJson("project-key")).resolves.toBeNull();
    await expect(
      setCachedJson("project-key", { name: "Project" }, 120),
    ).resolves.toBeUndefined();
    await expect(deleteCacheKeys("project-key")).resolves.toBeUndefined();
  });

  it("uses versioned, workspace-scoped project keys", () => {
    expect(getWorkspaceProjectsCacheKey("workspace-1")).toBe(
      "nexus:v1:workspace:workspace-1:projects",
    );
    expect(getProjectCacheKey("workspace-1", "project-1")).toBe(
      "nexus:v1:workspace:workspace-1:project:project-1",
    );
  });
});
