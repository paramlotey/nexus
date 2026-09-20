import { z } from "zod";

const documentBodyFields = {
  title: z.string().trim().min(1).max(200),
  content: z.string().max(100_000),
};

export const createDocumentSchema = z.object({
  body: z.object({
    title: documentBodyFields.title,
    content: documentBodyFields.content.optional(),
    projectId: z.string().min(1).optional(),
  }),
});

export const updateDocumentSchema = z.object({
  params: z.object({ documentId: z.string().min(1) }),
  body: z
    .object({
      title: documentBodyFields.title.optional(),
      content: documentBodyFields.content.optional(),
    })
    .refine(
      (data) => data.title !== undefined || data.content !== undefined,
      { message: "At least one field is required" },
    ),
});

export const documentIdSchema = z.object({
  params: z.object({ documentId: z.string().min(1) }),
});

export const listDocumentsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    projectId: z.string().min(1).optional(),
  }),
});
