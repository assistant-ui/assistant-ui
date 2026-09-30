import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        lines: 80,
        functions: 99,
        branches: 61,
        statements: 80,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
  },
});
