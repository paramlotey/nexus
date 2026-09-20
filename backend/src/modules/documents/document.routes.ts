import { Router } from "express";

import {
  createDocument,
  deleteDocument,
  getDocumentById,
  listDocuments,
  updateDocument,
} from "./document.controller.js";
import {
  createDocumentSchema,
  documentIdSchema,
  listDocumentsSchema,
  updateDocumentSchema,
} from "./document.validation.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireWorkspaceRole } from "../../middleware/workspace-role.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";

const router = Router({ mergeParams: true });
const canReadDocuments = requireWorkspaceRole(
  "OWNER",
  "ADMIN",
  "MEMBER",
  "VIEWER",
);
const canWriteDocuments = requireWorkspaceRole("OWNER", "ADMIN", "MEMBER");

/**
 * @openapi
 * /api/workspaces/{workspaceId}/documents:
 *   get:
 *     tags: [Documents]
 *     summary: List workspace documents
 *     description: Returns paginated documents ordered by most recently updated, optionally filtered by project.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: projectId
 *         schema: { type: string }
 *     responses:
 *       200: { description: Documents returned successfully }
 *       400: { description: Invalid request parameters }
 *       401: { description: Authentication required }
 *       403: { description: Workspace access denied }
 *       404: { description: Project not found }
 *   post:
 *     tags: [Documents]
 *     summary: Create a workspace document
 *     description: OWNER, ADMIN and MEMBER can create documents.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDocumentRequest'
 *     responses:
 *       201: { description: Document created successfully }
 *       400: { description: Invalid request }
 *       401: { description: Authentication required }
 *       403: { description: Insufficient workspace permissions }
 *       404: { description: Project not found }
 */
router
  .route("/")
  .get(
    authenticate,
    canReadDocuments,
    validate(listDocumentsSchema),
    listDocuments,
  )
  .post(
    authenticate,
    canWriteDocuments,
    validate(createDocumentSchema),
    createDocument,
  );

/**
 * @openapi
 * /api/workspaces/{workspaceId}/documents/{documentId}:
 *   get:
 *     tags: [Documents]
 *     summary: Get a workspace document
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Document returned successfully }
 *       400: { description: Invalid document ID }
 *       401: { description: Authentication required }
 *       403: { description: Workspace access denied }
 *       404: { description: Document not found }
 *   patch:
 *     tags: [Documents]
 *     summary: Update a workspace document
 *     description: OWNER, ADMIN and MEMBER can update documents.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateDocumentRequest'
 *     responses:
 *       200: { description: Document updated successfully }
 *       400: { description: Invalid request }
 *       401: { description: Authentication required }
 *       403: { description: Insufficient workspace permissions }
 *       404: { description: Document not found }
 *   delete:
 *     tags: [Documents]
 *     summary: Delete a workspace document
 *     description: OWNER, ADMIN and MEMBER can delete documents.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workspaceId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Document deleted successfully }
 *       400: { description: Invalid document ID }
 *       401: { description: Authentication required }
 *       403: { description: Insufficient workspace permissions }
 *       404: { description: Document not found }
 */
router
  .route("/:documentId")
  .get(
    authenticate,
    canReadDocuments,
    validate(documentIdSchema),
    getDocumentById,
  )
  .patch(
    authenticate,
    canWriteDocuments,
    validate(updateDocumentSchema),
    updateDocument,
  )
  .delete(
    authenticate,
    canWriteDocuments,
    validate(documentIdSchema),
    deleteDocument,
  );

export default router;
