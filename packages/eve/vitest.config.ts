import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 97,
        functions: 98,
        branches: 93,
        statements: 97,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
    fsModuleCache: true,
  },
});
