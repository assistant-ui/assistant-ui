import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**"],
      exclude: ["src/testUtils.ts"],
    },
    environment: "node",
    pool: "threads",
    fsModuleCache: true,
    globals: true,
  },
});
