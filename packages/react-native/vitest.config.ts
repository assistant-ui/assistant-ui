import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "react-native": "react-native-web",
    },
  },
  test: {
    coverage: {
      thresholds: {
        lines: 98,
        functions: 97,
        branches: 92,
        statements: 98,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
    environment: "jsdom",
    pool: "threads",
    fsModuleCache: true,
    globals: true,
    passWithNoTests: true,
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
