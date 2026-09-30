import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        lines: 95,
        functions: 74,
        branches: 99,
        statements: 91,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
  },
});
