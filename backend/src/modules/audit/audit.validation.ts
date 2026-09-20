import { z } from "zod";

import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from "./audit.model.js";

export const getAuditLogsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),

    limit: z.coerce.number().int().min(1).max(100).optional(),

    action: z.enum(AUDIT_ACTIONS).optional(),

    entityType: z.enum(AUDIT_ENTITY_TYPES).optional(),

    actorId: z.string().optional(),
  }),
});
