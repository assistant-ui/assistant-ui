import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 93,
        functions: 97,
        branches: 82,
        statements: 89,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
  },
});
