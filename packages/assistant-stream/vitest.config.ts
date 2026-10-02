import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/core/serialization/assistant-transport/__fixtures__/**"],
    },
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: true,
    env: { IOREDIS_PEER_MAJOR: "6" },
  },
});
