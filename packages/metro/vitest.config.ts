import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/__fixtures__/**"],
      thresholds: {
        lines: 66,
        functions: 71,
        branches: 70,
        statements: 67,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
  },
});
