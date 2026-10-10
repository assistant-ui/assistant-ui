import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/tests/**"],
      thresholds: {
        lines: 86,
        functions: 75,
        branches: 76,
        statements: 84,
        autoUpdate: (threshold) => Math.max(0, Math.floor(threshold) - 1),
      },
    },
    environment: "node",
    globals: true,
    passWithNoTests: true,
  },
});
