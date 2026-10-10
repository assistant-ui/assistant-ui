import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
      thresholds: {
        lines: 51,
        functions: 27,
        branches: 50,
        statements: 53,
        autoUpdate: (threshold, previous) =>
          Math.max(previous, Math.floor(threshold) - 1),
      },
    },
  },
});
