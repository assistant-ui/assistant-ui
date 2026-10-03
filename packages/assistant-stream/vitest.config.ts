import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: true,
    env: { AI_PEER_MAJOR: "7", IOREDIS_PEER_MAJOR: "6" },
  },
});
