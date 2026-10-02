import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**"],
    },
    environment: "node",
    pool: "threads",
    fsModuleCache: true,
    globals: true,
    passWithNoTests: true,
  },
});
