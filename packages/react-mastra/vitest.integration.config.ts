import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    globals: true,
    testTimeout: 30000, // 30 seconds for integration tests
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
