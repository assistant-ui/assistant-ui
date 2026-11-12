import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 16,
        functions: 11,
        branches: 15,
        statements: 14,
        autoUpdate: (threshold, previous) =>
          Math.max(previous, Math.floor(threshold) - 1),
      },
    },
  },
});
