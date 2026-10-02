import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**"],
      thresholds: {
        lines: 99,
        functions: 99,
        branches: 90,
        statements: 99,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
  },
});
