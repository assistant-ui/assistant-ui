import { defineConfig } from "vitest/config";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

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
