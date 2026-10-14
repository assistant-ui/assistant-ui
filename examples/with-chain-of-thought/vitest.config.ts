import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["app/**/*.{ts,tsx}"],
      thresholds: {
        lines: 4,
        functions: 2,
        branches: 0,
        statements: 4,
        autoUpdate: (threshold, previous) =>
          Math.max(previous, Math.floor(threshold) - 1),
      },
    },
  },
});
