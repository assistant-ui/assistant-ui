import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/performance/**/*.test.ts"],
    globals: true,
    testTimeout: 60000, // 60 seconds for performance tests
  },
  resolve: {
    alias: {
      "@": "./src",
    },
  },
});