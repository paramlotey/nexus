import { z } from "zod";

const prioritySchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

const assigneeIdsSchema = z
  .array(z.string().min(1))
  .refine((ids) => new Set(ids).size === ids.length, {
    message: "Assignee IDs must be unique",
  });

export const createTaskSchema = z.object({
  body: z.object({
    columnId: z.string().min(1),

    title: z.string().trim().min(1).max(200),

    description: z.string().trim().max(5000).optional(),

    priority: prioritySchema.optional(),

    assigneeIds: assigneeIdsSchema.optional(),

    dueDate: z.coerce.date().optional(),
  }),
});

export const updateTaskSchema = z.object({
  body: z
    .object({
      title: z.string().trim().min(1).max(200).optional(),

      description: z.string().trim().max(5000).optional(),

      priority: prioritySchema.optional(),

      assigneeIds: assigneeIdsSchema.optional(),

      dueDate: z.coerce.date().nullable().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field is required",
    }),
});

export const moveTaskSchema = z.object({
  body: z.object({
    targetColumnId: z.string().min(1),
    position: z.number().int().min(0),
  }),
});
