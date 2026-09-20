import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { notFound } from "./middleware/not-found.middleware.js";
import { errorHandler } from "./middleware/error.middleware.js";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";
import authRoutes from "./modules/auth/auth.routes.js";
import workspaceRoutes from "./modules/workspaces/workspaces.routes.js";
import projectRoutes from "./modules/projects/project.routes.js";
import boardRoutes from "./modules/boards/board.routes.js";
import columnRoutes from "./modules/columns/column.routes.js";
import taskRoutes from "./modules/tasks/task.routes.js";
import commentRoutes from "./modules/comments/comment.routes.js";
import attachmentRoutes from "./modules/attachments/attachment.routes.js";
import auditRoutes from "./modules/audit/audit.route.js";
import searchRoutes from "./modules/search/search.routes.js";
import notificationRoutes from "./modules/notifications/notification.routes.js";

const app = express();
app.use(cors());

app.use(helmet());
app.use(morgan("dev"));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Nexus API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/workspaces/:workspaceId", projectRoutes);
app.use("/api/workspaces/:workspaceId/projects/:projectId/boards", boardRoutes);
app.use(
  "/api/workspaces/:workspaceId/projects/:projectId/boards/:boardId/columns",
  columnRoutes,
);
app.use(
  "/api/workspaces/:workspaceId/projects/:projectId/boards/:boardId/tasks",
  taskRoutes,
);
app.use(
  "/api/workspaces/:workspaceId/projects/:projectId/boards/:boardId/tasks/:taskId/comments",
  commentRoutes,
);
app.use(
  "/api/workspaces/:workspaceId/projects/:projectId/boards/:boardId/tasks/:taskId/attachments",
  attachmentRoutes,
);
app.use("/api/workspaces/:workspaceId/audit-logs", auditRoutes);
app.use("/api/workspaces/:workspaceId/search", searchRoutes);
app.use(
  "/api/workspaces/:workspaceId/notifications",
  notificationRoutes,
);

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/api/docs.json", (_req, res) => {
  res.status(200).json(swaggerSpec);
});

app.use(notFound);
app.use(errorHandler);

export default app;
