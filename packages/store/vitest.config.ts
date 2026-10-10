import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 92,
        functions: 89,
        branches: 82,
        statements: 90,
        autoUpdate: (threshold) => Math.max(0, Math.floor(threshold) - 1),
      },
    },
  },
});
