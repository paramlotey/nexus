import { z } from "zod";

export const SEARCH_ENTITY_TYPES = [
  "PROJECT",
  "BOARD",
  "TASK",
  "COMMENT",
  "DOCUMENT",
] as const;

export type SearchEntityType = (typeof SEARCH_ENTITY_TYPES)[number];

export const searchWorkspaceSchema = z.object({
  query: z.object({
    q: z
      .string()
      .trim()
      .min(2, "Search query must be at least 2 characters")
      .max(100, "Search query cannot exceed 100 characters"),

    type: z.enum(SEARCH_ENTITY_TYPES).optional(),

    limit: z.coerce.number().int().min(1).max(20).optional(),
  }),
});
