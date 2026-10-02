import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["app/**", "components/**"],
      thresholds: {
        lines: 89,
        functions: 59,
        branches: 84,
        statements: 85,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
  },
});
