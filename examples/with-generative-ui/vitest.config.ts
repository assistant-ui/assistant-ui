import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["app/**", "components/**", "lib/**"],
      thresholds: {
        lines: 87,
        functions: 99,
        branches: 74,
        statements: 85,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
