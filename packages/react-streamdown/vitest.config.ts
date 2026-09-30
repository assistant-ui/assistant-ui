import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        lines: 99,
        functions: 99,
        branches: 95,
        statements: 97,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
    environment: "jsdom",
    pool: "threads",
    fsModuleCache: true,
  },
});
