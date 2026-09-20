import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",

    globalSetup: ["./tests/global-setup.ts"],
    setupFiles: ["./tests/setup.ts"],

    fileParallelism: false,

    hookTimeout: 30_000,
    testTimeout: 15_000,
    teardownTimeout: 30_000,

    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],

      include: ["src/**/*.ts"],

      exclude: ["src/server.ts", "src/types/**", "src/scripts/**"],

      thresholds: {
        lines: 60,
        functions: 60,
        statements: 60,
        branches: 60,
      },
    },
  },
});
