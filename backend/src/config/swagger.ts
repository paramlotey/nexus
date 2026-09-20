import swaggerJsdoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",

    info: {
      title: "WorkSpace API",
      version: "1.0.0",
      description: "REST API for the WorkSpace Mini SaaS application.",
    },

    servers: [
      {
        url: "http://localhost:7000",
        description: "Local development",
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },

      schemas: {
        Error: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            message: {
              type: "string",
            },
          },
        },

        RegisterRequest: {
          type: "object",
          required: ["name", "email", "password"],
          properties: {
            name: {
              type: "string",
              example: "Paramvir Singh",
            },
            email: {
              type: "string",
              format: "email",
              example: "paramvir@example.com",
            },
            password: {
              type: "string",
              format: "password",
              example: "Password@123",
            },
          },
        },

        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
              format: "email",
            },
            password: {
              type: "string",
              format: "password",
            },
          },
        },

        CreateWorkspaceRequest: {
          type: "object",
          required: ["name"],
          properties: {
            name: {
              type: "string",
              example: "Engineering Team",
            },
          },
        },

        WorkspaceMemberRequest: {
          type: "object",
          required: ["email", "role"],
          properties: {
            email: {
              type: "string",
              format: "email",
            },
            role: {
              type: "string",
              enum: ["ADMIN", "MEMBER", "VIEWER"],
            },
          },
        },

        UpdateWorkspaceRoleRequest: {
          type: "object",
          required: ["role"],
          properties: {
            role: {
              type: "string",
              enum: ["ADMIN", "MEMBER", "VIEWER"],
            },
          },
        },

        CreateProjectRequest: {
          type: "object",
          required: ["name"],
          properties: {
            name: {
              type: "string",
              minLength: 2,
              maxLength: 100,
              example: "Website Redesign",
            },
            description: {
              type: "string",
              maxLength: 1000,
              example: "Redesign the marketing website",
            },
          },
        },

        UpdateProjectRequest: {
          type: "object",
          properties: {
            name: {
              type: "string",
              minLength: 2,
              maxLength: 100,
              example: "Website Redesign V2",
            },
            description: {
              type: "string",
              maxLength: 1000,
              example: "Updated project scope",
            },
          },
        },
        
        CreateBoardRequest: {
          type: "object",
          required: ["name"],
          properties: {
            name: {
              type: "string",
              minLength: 2,
              maxLength: 100,
              example: "Development Board",
            },
            description: {
              type: "string",
              maxLength: 1000,
              example: "Main development workflow",
            },
          },
        },

        UpdateBoardRequest: {
          type: "object",
          properties: {
            name: {
              type: "string",
              minLength: 2,
              maxLength: 100,
            },
            description: {
              type: "string",
              maxLength: 1000,
            },
          },
        },

        CreateColumnRequest: {
          type: "object",
          required: ["name"],
          properties: {
            name: {
              type: "string",
              minLength: 1,
              maxLength: 80,
              example: "TODO",
            },
          },
        },

        UpdateColumnRequest: {
          type: "object",
          required: ["name"],
          properties: {
            name: {
              type: "string",
              minLength: 1,
              maxLength: 80,
              example: "BACKLOG",
            },
          },
        },

        ReorderColumnsRequest: {
          type: "object",
          required: ["columnIds"],
          properties: {
            columnIds: {
              type: "array",
              minItems: 1,
              uniqueItems: true,
              items: {
                type: "string",
              },
              example: ["columnId3", "columnId1", "columnId2"],
            },
          },
        },

        CreateTaskRequest: {
          type: "object",
          required: ["columnId", "title"],
          properties: {
            columnId: {
              type: "string",
            },
            title: {
              type: "string",
              maxLength: 200,
              example: "Implement login page",
            },
            description: {
              type: "string",
              maxLength: 5000,
            },
            priority: {
              type: "string",
              enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
              default: "MEDIUM",
            },
            assigneeIds: {
              type: "array",
              uniqueItems: true,
              items: {
                type: "string",
              },
            },
            dueDate: {
              type: "string",
              format: "date-time",
            },
          },
        },

        UpdateTaskRequest: {
          type: "object",
          properties: {
            title: {
              type: "string",
              maxLength: 200,
            },
            description: {
              type: "string",
              maxLength: 5000,
            },
            priority: {
              type: "string",
              enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
            },
            assigneeIds: {
              type: "array",
              uniqueItems: true,
              items: {
                type: "string",
              },
            },
            dueDate: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
          },
        },

        MoveTaskRequest: {
          type: "object",
          required: ["targetColumnId", "position"],
          properties: {
            targetColumnId: {
              type: "string",
            },
            position: {
              type: "integer",
              minimum: 0,
            },
          },
        },
      },
    },
  },

  apis: [
    "./src/app.ts",
    "./src/modules/**/*.routes.ts",
    "./dist/app.js",
    "./dist/modules/**/*.routes.js",
  ],
});
