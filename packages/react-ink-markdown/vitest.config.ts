import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 98,
        functions: 99,
        branches: 84,
        statements: 93,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
    environment: "node",
  },
});
