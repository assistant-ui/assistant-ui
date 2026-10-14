import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    fsModuleCache: true,
    globals: true,
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/testUtils.ts"],
      thresholds: {
        lines: 97,
        functions: 91,
        branches: 90,
        statements: 93,
        autoUpdate: (threshold, previous) =>
          Math.max(previous, Math.floor(threshold) - 1),
      },
    },
  },
});
