import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "react-native": "react-native-web",
    },
  },
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
    },
    environment: "jsdom",
    pool: "threads",
    fsModuleCache: true,
    globals: true,
    passWithNoTests: true,
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
