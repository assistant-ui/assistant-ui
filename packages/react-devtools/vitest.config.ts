import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        lines: 77,
        functions: 73,
        branches: 59,
        statements: 75,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
    environment: "node",
    pool: "threads",
    fsModuleCache: true,
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
