import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 80,
        functions: 83,
        branches: 67,
        statements: 77,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
    environment: "node",
    pool: "threads",
    fsModuleCache: true,
    globals: true,
    passWithNoTests: true,
  },
});
