import { defineConfig } from "vitest/config";
import { aui } from "@assistant-ui/vite";

export default defineConfig({
  plugins: [aui()],
  test: {
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
