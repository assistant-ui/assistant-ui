import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 87,
        functions: 86,
        branches: 73,
        statements: 83,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
    environment: "node",
  },
});
