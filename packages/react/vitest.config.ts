import { defineConfig } from "vitest/config";
import { aui } from "@assistant-ui/vite";

export default defineConfig({
  plugins: [aui()],
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/tests/**", "src/unstable/webmcp/__tests__/**"],
      thresholds: {
        lines: 84,
        functions: 75,
        branches: 74,
        statements: 82,
        autoUpdate: (threshold) => Math.max(0, Math.floor(threshold) - 1),
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
