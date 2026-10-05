import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 97,
        functions: 97,
        branches: 93,
        statements: 96,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
    fsModuleCache: true,
  },
});
