const CACHE_VERSION = "v1";

export const getWorkspaceProjectsCacheKey = (workspaceId: string): string => {
  return ["nexus", CACHE_VERSION, "workspace", workspaceId, "projects"].join(
    ":",
  );
};

export const getProjectCacheKey = (
  workspaceId: string,
  projectId: string,
): string => {
  return [
    "nexus",
    CACHE_VERSION,
    "workspace",
    workspaceId,
    "project",
    projectId,
  ].join(":");
};
