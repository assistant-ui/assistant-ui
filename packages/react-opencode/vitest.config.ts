import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/testUtils.ts"],
      thresholds: {
        lines: 86,
        functions: 81,
        branches: 69,
        statements: 84,
        autoUpdate: (threshold, previous) =>
          Math.max(previous, Math.floor(threshold) - 1),
      },
    },
    environment: "node",
    pool: "threads",
    fsModuleCache: true,
    globals: true,
  },
});
