import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
      thresholds: {
        lines: 52,
        functions: 28,
        branches: 51,
        statements: 54,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
  },
});
