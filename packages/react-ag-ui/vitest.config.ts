import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**"],
    },
    pool: "threads",
    fsModuleCache: true,
  },
});
