import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    pool: "threads",
    fsModuleCache: true,
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
