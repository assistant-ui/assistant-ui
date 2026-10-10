import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 88,
        functions: 77,
        branches: 80,
        statements: 86,
        autoUpdate: (threshold) => Math.max(0, Math.floor(threshold) - 1),
      },
    },
  },
});
