import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 70,
        functions: 98,
        branches: 53,
        statements: 72,
        autoUpdate: (threshold) => Math.max(0, Math.floor(threshold) - 1),
      },
    },
  },
});
