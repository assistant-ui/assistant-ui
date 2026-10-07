import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["app/**/*.{ts,tsx}", "proxy.ts"],
      thresholds: {
        lines: 15,
        functions: 6,
        branches: 43,
        statements: 15,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
  },
});
