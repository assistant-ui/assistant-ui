import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 95,
        functions: 96,
        branches: 88,
        statements: 95,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    globals: true,
  },
});
