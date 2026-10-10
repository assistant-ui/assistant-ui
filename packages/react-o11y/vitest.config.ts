import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 80,
        functions: 54,
        branches: 68,
        statements: 76,
        autoUpdate: (threshold) => Math.max(0, Math.floor(threshold) - 1),
      },
    },
  },
});
