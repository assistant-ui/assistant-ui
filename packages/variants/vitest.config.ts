import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 98,
        functions: 98,
        branches: 89,
        statements: 96,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    globals: true,
  },
});
