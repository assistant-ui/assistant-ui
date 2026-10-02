import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["app/**/*.{ts,tsx}"],
      thresholds: {
        lines: 99,
        functions: 99,
        statements: 99,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
  },
});
