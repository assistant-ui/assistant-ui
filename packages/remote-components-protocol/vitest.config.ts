import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 92,
        functions: 86,
        branches: 82,
        statements: 88,
        autoUpdate: (threshold, previous) =>
          Math.max(previous, Math.floor(threshold) - 1),
      },
    },
  },
});
