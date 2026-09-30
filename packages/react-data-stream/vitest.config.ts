import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        lines: 98,
        functions: 99,
        branches: 97,
        statements: 98,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
  },
});
