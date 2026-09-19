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
