import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 89,
        functions: 80,
        branches: 77,
        statements: 86,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
    environment: "node",
    fsModuleCache: true,
    globals: true,
  },
});
