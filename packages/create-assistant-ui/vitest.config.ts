import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 83,
        functions: 74,
        branches: 53,
        statements: 82,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
  },
});
