import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/__tests__/**"],
      thresholds: {
        lines: 98,
        functions: 99,
        branches: 94,
        statements: 97,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
    environment: "jsdom",
    pool: "threads",
    fsModuleCache: true,
  },
});
