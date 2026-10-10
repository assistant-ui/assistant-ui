import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/core/serialization/assistant-transport/__fixtures__/**"],
      thresholds: {
        lines: 91,
        functions: 91,
        branches: 85,
        statements: 89,
        autoUpdate: (threshold) => Math.max(0, Math.floor(threshold) - 1),
      },
    },
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: true,
    env: { AI_PEER_MAJOR: "7", IOREDIS_PEER_MAJOR: "6" },
  },
});
