import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**"],
    },
    environment: "node",
    fsModuleCache: true,
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
