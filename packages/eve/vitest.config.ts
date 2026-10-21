import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/testUtils.ts"],
      thresholds: {
        lines: 96,
        functions: 96,
        branches: 92,
        statements: 95,
        autoUpdate: (threshold, previous) =>
          Math.max(previous, Math.floor(threshold) - 1),
      },
    },
    fsModuleCache: true,
  },
});
