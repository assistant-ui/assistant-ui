import { defineConfig } from "vitest/config";
import { aui } from "@assistant-ui/vite";

export default defineConfig({
  plugins: [aui()],
  test: {
    coverage: {
      thresholds: {
        lines: 84,
        functions: 74,
        branches: 72,
        statements: 81,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
    environment: "node",
    pool: "threads",
    fsModuleCache: true,
    globals: true,
    setupFiles: ["./src/tests/setup.ts"],
    typecheck: {
      enabled: true,
      include: ["src/tests/augmentations.test.ts"],
      tsconfig: "./tsconfig.json",
      ignoreSourceErrors: true,
    },
  },
});
