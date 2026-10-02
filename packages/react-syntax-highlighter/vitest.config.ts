import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**"],
    },
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
