import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/tests/**"],
    },
    environment: "jsdom",
    pool: "threads",
    fsModuleCache: true,
    include: ["src/**/*.test.{ts,tsx}"],
    globals: true,
  },
});
