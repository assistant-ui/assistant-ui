import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 98,
        functions: 98,
        branches: 89,
        statements: 98,
        autoUpdate: (threshold) => Math.max(0, Math.floor(threshold) - 1),
      },
    },
  },
});
