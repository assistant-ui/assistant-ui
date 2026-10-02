import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**"],
      exclude: ["src/tests/**"],
      thresholds: {
        lines: 88,
        functions: 78,
        branches: 77,
        statements: 86,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
    environment: "node",
    globals: true,
    passWithNoTests: true,
  },
});
