import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 97,
        functions: 99,
        branches: 88,
        statements: 96,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    globals: true,
  },
});
