import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      thresholds: {
        lines: 86,
        functions: 85,
        branches: 72,
        statements: 82,
        autoUpdate: (threshold) => Math.max(0, Math.floor(threshold) - 1),
      },
    },
    environment: "node",
  },
});
