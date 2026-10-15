import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/__fixtures__/**"],
      thresholds: {
        lines: 65,
        functions: 70,
        branches: 69,
        statements: 66,
        autoUpdate: (threshold, previous) =>
          Math.max(previous, Math.floor(threshold) - 1),
      },
    },
  },
});
