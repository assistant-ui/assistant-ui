import { defineConfig } from "vitest/config";
import { aui } from "@assistant-ui/vite";

export default defineConfig({
  plugins: [aui()],
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/tests/**"],
      thresholds: {
        lines: 87,
        functions: 81,
        branches: 82,
        statements: 86,
        autoUpdate: (threshold) => Math.max(0, Math.floor(threshold) - 1),
      },
    },
    environment: "node",
    globals: true,
    passWithNoTests: true,
  },
});
