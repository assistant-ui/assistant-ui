import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: [
        "app/**/*.{ts,tsx}",
        "components/**/*.{ts,tsx}",
        "lib/**/*.{ts,tsx}",
        "proxy.ts",
      ],
      thresholds: {
        lines: 5,
        functions: 1,
        branches: 11,
        statements: 5,
        autoUpdate: (threshold, previous) =>
          Math.max(previous, Math.floor(threshold) - 1),
      },
    },
  },
});
