import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["app/**/*.test.{ts,tsx}"],
    coverage: {
      include: ["app/**/*.{ts,tsx}"],
    },
  },
});
