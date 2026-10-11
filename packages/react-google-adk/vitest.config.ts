import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/tests/**"],
      thresholds: {
        lines: 87,
        functions: 85,
        branches: 80,
        statements: 84,
        autoUpdate: (threshold, previous) =>
          Math.max(previous, Math.floor(threshold) - 1),
      },
    },
    environment: "node",
    pool: "threads",
    fsModuleCache: true,
    include: ["src/**/*.test.{ts,tsx}"],
    globals: true,
  },
});
