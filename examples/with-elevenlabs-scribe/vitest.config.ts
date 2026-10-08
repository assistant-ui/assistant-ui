import { defineConfig } from "vitest/config";

export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    coverage: {
      include: ["app/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
      thresholds: {
        lines: 19,
        functions: 9,
        branches: 46,
        statements: 20,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
  },
});
