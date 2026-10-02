import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/__tests__/**", "src/tests/**"],
      thresholds: {
        lines: 95,
        functions: 88,
        branches: 87,
        statements: 93,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
  },
});
