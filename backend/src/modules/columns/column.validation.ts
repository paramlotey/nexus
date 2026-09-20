import { z } from "zod";

export const createColumnSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(80),
  }),
});

export const updateColumnSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(80),
  }),
});

export const reorderColumnsSchema = z.object({
  body: z.object({
    columnIds: z
      .array(z.string().min(1))
      .min(1)
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "Column IDs must be unique",
      }),
  }),
});
