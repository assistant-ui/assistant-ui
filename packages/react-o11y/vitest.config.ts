import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 81,
        functions: 55,
        branches: 69,
        statements: 77,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
  },
});
