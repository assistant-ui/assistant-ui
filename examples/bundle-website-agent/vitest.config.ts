import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 20,
        functions: 15,
        branches: 24,
        statements: 21,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
  },
});
