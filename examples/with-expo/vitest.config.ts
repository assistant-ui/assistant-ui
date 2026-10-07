import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: [
        "app/**/*.{ts,tsx}",
        "components/**/*.{ts,tsx}",
        "hooks/**/*.{ts,tsx}",
      ],
      thresholds: {
        lines: 11,
        functions: 7,
        branches: 12,
        statements: 11,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
  },
});
