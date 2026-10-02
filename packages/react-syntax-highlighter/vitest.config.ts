import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      thresholds: {
        lines: 99,
        functions: 99,
        statements: 99,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
  },
});
