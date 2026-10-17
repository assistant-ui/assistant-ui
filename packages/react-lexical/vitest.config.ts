import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 87,
        functions: 90,
        branches: 73,
        statements: 84,
        autoUpdate: (threshold, previous) =>
          Math.max(previous, Math.floor(threshold) - 1),
      },
    },
    environment: "node",
    pool: "threads",
    fsModuleCache: true,
    globals: true,
    passWithNoTests: true,
  },
});
