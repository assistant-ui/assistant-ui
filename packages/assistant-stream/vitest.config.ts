import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: true,
    env: { IOREDIS_PEER_MAJOR: "6" },
  },
});
