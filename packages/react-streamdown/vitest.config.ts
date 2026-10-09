import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/__tests__/**"],
      thresholds: {
        lines: 97,
        functions: 99,
        branches: 93,
        statements: 96,
        autoUpdate: (threshold) => Math.max(0, Math.floor(threshold) - 1),
      },
    },
    environment: "jsdom",
    pool: "threads",
    fsModuleCache: true,
  },
});
