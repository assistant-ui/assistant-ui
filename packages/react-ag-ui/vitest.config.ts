import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 96,
        functions: 94,
        branches: 85,
        statements: 93,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
    pool: "threads",
    fsModuleCache: true,
  },
});
