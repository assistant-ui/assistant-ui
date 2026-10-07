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
        lines: 6,
        functions: 2,
        branches: 12,
        statements: 6,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
  },
});
