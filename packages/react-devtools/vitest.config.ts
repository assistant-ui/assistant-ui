import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
    },
    environment: "node",
    pool: "threads",
    fsModuleCache: true,
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
