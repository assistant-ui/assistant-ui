import { defineConfig } from "vitest/config";

export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    coverage: {
      include: ["app/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
      thresholds: {
        lines: 52,
        functions: 28,
        branches: 50,
        statements: 50,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
  },
});
