import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 74,
        functions: 61,
        branches: 80,
        statements: 74,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
    globals: true,
    environment: "node",
  },
  resolve: {
    extensions: [".js", ".ts", ".json"],
  },
});
