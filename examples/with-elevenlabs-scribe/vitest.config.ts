import { defineConfig } from "vitest/config";

export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    coverage: {
      include: ["app/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
      thresholds: {
        lines: 18,
        functions: 8,
        branches: 45,
        statements: 19,
        autoUpdate: (threshold, previous) =>
          Math.max(previous, Math.floor(threshold) - 1),
      },
    },
  },
});
