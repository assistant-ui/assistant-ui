import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/tests/**"],
      thresholds: {
        lines: 96,
        functions: 91,
        branches: 90,
        statements: 95,
        autoUpdate: (threshold, previous) =>
          Math.max(previous, Math.floor(threshold) - 1),
      },
    },
    environment: "node",
    globals: true,
    setupFiles: ["./src/tests/setup.ts"],
  },
});
