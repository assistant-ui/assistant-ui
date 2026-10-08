import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["app/**/*.{ts,tsx}"],
      thresholds: {
        lines: 5,
        functions: 3,
        branches: 0,
        statements: 5,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
  },
});
