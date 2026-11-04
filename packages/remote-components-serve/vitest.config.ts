import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 49,
        functions: 70,
        branches: 49,
        statements: 47,
        autoUpdate: (threshold, previous) =>
          Math.max(previous, Math.floor(threshold) - 1),
      },
    },
  },
});
