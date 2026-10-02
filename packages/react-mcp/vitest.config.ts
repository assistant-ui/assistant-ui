import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 80,
        functions: 71,
        branches: 76,
        statements: 77,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
    environment: "node",
    fsModuleCache: true,
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
