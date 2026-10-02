import { defineConfig } from "vitest/config";
import { aui } from "@assistant-ui/vite";

export default defineConfig({
  plugins: [aui()],
  test: {
    coverage: {
      include: ["src/**"],
      exclude: ["src/tests/**"],
      thresholds: {
        lines: 90,
        functions: 85,
        branches: 83,
        statements: 89,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
    environment: "node",
    globals: true,
    passWithNoTests: true,
  },
});
