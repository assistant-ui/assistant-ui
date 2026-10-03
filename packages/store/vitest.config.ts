import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 93,
        functions: 90,
        branches: 83,
        statements: 91,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
  },
});
