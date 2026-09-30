import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        lines: 85,
        functions: 74,
        branches: 53,
        statements: 84,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
  },
});
