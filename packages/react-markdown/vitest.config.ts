import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 95,
        functions: 86,
        branches: 90,
        statements: 93,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    globals: true,
  },
});
