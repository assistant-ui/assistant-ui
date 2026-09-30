import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        lines: 90,
        functions: 84,
        branches: 82,
        statements: 89,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
  },
});
