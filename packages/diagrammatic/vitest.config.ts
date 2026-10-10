import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/react/testUtils.tsx"],
      thresholds: {
        lines: 96,
        functions: 91,
        branches: 79,
        statements: 94,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
