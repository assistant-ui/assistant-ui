import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 89,
        functions: 78,
        branches: 82,
        statements: 87,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
  },
});
