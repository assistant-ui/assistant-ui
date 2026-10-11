import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/__tests__/**", "src/tests/**"],
      thresholds: {
        lines: 94,
        functions: 87,
        branches: 86,
        statements: 92,
        autoUpdate: (threshold, previous) =>
          Math.max(previous, Math.floor(threshold) - 1),
      },
    },
  },
});
