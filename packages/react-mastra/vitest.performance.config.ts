import { defineConfig } from "vitest/config";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/performance/**/*.test.ts"],
    globals: true,
    testTimeout: 60000, // 60 seconds for performance tests
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
