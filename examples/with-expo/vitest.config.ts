import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        lines: 83,
        functions: 99,
        branches: 76,
        statements: 84,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
  },
});
