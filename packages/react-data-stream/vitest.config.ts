import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "__tests__/**/*.test.ts"],
    globals: true,
  },
});
