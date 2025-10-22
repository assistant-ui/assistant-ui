import { defineConfig } from "vitest/config";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    globals: true,
    setupFiles: ["./src/testSetup.ts"],

    // Strict memory settings
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true, // Run one test at a time for memory analysis
        maxForks: 1,
        minForks: 1,
      },
    },

    // Longer timeouts for memory profiling
    testTimeout: 30000,
    hookTimeout: 30000,

    isolate: true,
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,

    // Detailed reporting
    reporters: ["verbose"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
