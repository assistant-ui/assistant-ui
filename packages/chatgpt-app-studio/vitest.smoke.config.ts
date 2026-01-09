import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/smoke.test.ts"],
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
