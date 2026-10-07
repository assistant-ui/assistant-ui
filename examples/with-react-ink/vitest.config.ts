import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    clearMocks: true,
    environment: "node",
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 59,
        functions: 55,
        branches: 81,
        statements: 58,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
  },
});
