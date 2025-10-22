import { defineConfig } from "vitest/config";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "tests/integration/**/*.test.ts"],
    globals: true,
    setupFiles: ["./src/testSetup.ts"],

    // Memory optimizations
    pool: "forks", // Use forks instead of threads for better isolation
    poolOptions: {
      forks: {
        singleFork: false, // Allow parallel execution with limits
        maxForks: 2, // Conservative: only 2 concurrent test files
        minForks: 1,
      },
    },

    // Timeouts to prevent hanging tests
    testTimeout: 15000, // 15 seconds per test
    hookTimeout: 15000, // 15 seconds for hooks

    // Isolate tests better
    isolate: true, // Each test file runs in isolation

    // Cleanup between tests
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,

    // Garbage collection hint
    sequence: {
      shuffle: false, // Consistent test order for reproducibility
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
