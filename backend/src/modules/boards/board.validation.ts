import { z } from "zod";

export const createBoardSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100),

    description: z.string().trim().max(1000).optional(),
  }),
});

export const updateBoardSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2).max(100).optional(),

      description: z.string().trim().max(1000).optional(),
    })
    .refine(
      (data) => data.name !== undefined || data.description !== undefined,
      {
        message: "At least one field is required",
      },
    ),
});
