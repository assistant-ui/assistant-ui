import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        lines: 87,
        functions: 82,
        branches: 70,
        statements: 85,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
    environment: "node",
    pool: "threads",
    fsModuleCache: true,
    globals: true,
  },
});
