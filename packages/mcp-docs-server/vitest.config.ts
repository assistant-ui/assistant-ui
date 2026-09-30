import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        lines: 85,
        functions: 72,
        branches: 87,
        statements: 84,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
    globals: true,
    environment: "node",
  },
  resolve: {
    extensions: [".js", ".ts", ".json"],
  },
});
