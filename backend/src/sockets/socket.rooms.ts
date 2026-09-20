export const getUserRoom = (userId: string): string => `user:${userId}`;

export const getWorkspaceRoom = (workspaceId: string): string =>
  `workspace:${workspaceId}`;
