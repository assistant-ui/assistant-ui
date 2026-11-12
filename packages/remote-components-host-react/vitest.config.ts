import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 13,
        functions: 5,
        branches: 10,
        statements: 11,
        autoUpdate: (threshold, previous) =>
          Math.max(previous, Math.floor(threshold) - 1),
      },
    },
  },
});
