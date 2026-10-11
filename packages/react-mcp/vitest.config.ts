import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 79,
        functions: 70,
        branches: 75,
        statements: 76,
        autoUpdate: (threshold, previous) =>
          Math.max(previous, Math.floor(threshold) - 1),
      },
    },
    environment: "node",
    fsModuleCache: true,
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
