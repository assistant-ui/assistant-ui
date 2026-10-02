import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**"],
      exclude: ["src/core/serialization/assistant-transport/__fixtures__/**"],
      thresholds: {
        lines: 92,
        functions: 92,
        branches: 86,
        statements: 90,
        autoUpdate: (threshold) => Math.ceil(threshold) - 1,
      },
    },
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: true,
    env: { IOREDIS_PEER_MAJOR: "6" },
  },
});
