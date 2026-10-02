import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**"],
      exclude: ["src/__tests__/**", "src/tests/**"],
      thresholds: {
        lines: 95,
        functions: 89,
        branches: 87,
        statements: 93,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
  },
});
