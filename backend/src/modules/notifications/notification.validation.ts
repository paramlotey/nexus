import { z } from "zod";

export const getNotificationsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    unreadOnly: z.enum(["true", "false"]).optional(),
  }),
});

export const notificationIdSchema = z.object({
  params: z.object({
    notificationId: z.string().min(1),
  }),
});
