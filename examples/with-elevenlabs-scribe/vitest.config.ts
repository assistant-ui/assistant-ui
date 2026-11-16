import { defineConfig } from "vitest/config";

export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    coverage: {
      include: ["app/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
      thresholds: {
        lines: 26,
        functions: 15,
        branches: 50,
        statements: 26,
        autoUpdate: (threshold, previous) =>
          Math.max(previous, Math.floor(threshold) - 1),
      },
    },
  },
});
