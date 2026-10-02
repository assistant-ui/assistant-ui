import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**"],
      thresholds: {
        lines: 71,
        functions: 99,
        branches: 54,
        statements: 73,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
  },
});
