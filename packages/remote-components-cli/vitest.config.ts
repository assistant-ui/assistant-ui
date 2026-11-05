import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    testTimeout: 60_000,
    coverage: {
      include: ["src/**/*.ts"],
      thresholds: {
        lines: 72,
        functions: 57,
        branches: 66,
        statements: 70,
        autoUpdate: (threshold, previous) =>
          Math.max(previous, Math.floor(threshold) - 1),
      },
    },
  },
});
