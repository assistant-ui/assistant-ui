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
        lines: 98,
        functions: 92,
        branches: 91,
        statements: 94,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
  },
});
