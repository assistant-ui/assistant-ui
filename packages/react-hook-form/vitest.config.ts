import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        lines: 87,
        functions: 78,
        branches: 79,
        statements: 85,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
  },
});
