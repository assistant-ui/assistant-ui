import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/tests/**"],
      thresholds: {
        lines: 97,
        functions: 92,
        branches: 91,
        statements: 96,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
    environment: "node",
    globals: true,
    setupFiles: ["./src/tests/setup.ts"],
  },
});
