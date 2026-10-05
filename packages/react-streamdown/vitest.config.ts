import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/__tests__/**"],
    },
    environment: "jsdom",
    pool: "threads",
    fsModuleCache: true,
  },
});
