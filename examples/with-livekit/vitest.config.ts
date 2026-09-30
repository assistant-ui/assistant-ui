import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        lines: 77,
        functions: 54,
        branches: 64,
        statements: 74,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
  },
});
