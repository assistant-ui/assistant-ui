import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    fsModuleCache: true,
    globals: true,
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 98,
        functions: 93,
        branches: 90,
        statements: 94,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
  },
});
