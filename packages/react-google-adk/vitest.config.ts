import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        lines: 87,
        functions: 84,
        branches: 81,
        statements: 85,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
    environment: "jsdom",
    pool: "threads",
    fsModuleCache: true,
    include: ["src/**/*.test.{ts,tsx}"],
    globals: true,
  },
});
