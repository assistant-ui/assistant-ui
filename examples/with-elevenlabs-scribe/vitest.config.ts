import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["app/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
      thresholds: {
        lines: 21,
        functions: 11,
        branches: 46,
        statements: 22,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
  },
});
