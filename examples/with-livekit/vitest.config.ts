import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["app/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
      thresholds: {
        lines: 73,
        functions: 52,
        branches: 64,
        statements: 71,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
  },
});
