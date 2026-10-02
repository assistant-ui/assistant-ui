import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["app/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
      thresholds: {
        lines: 77,
        functions: 54,
        branches: 64,
        statements: 74,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
  },
});
