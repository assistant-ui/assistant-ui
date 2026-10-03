import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 78,
        functions: 99,
        branches: 61,
        statements: 78,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
  },
});
