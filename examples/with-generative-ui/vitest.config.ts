import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: [
        "app/**/*.{ts,tsx}",
        "components/**/*.{ts,tsx}",
        "lib/**/*.{ts,tsx}",
      ],
      thresholds: {
        lines: 10,
        functions: 7,
        branches: 4,
        statements: 10,
        autoUpdate: (threshold) => Math.max(0, Math.floor(threshold) - 1),
      },
    },
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
