import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**"],
      exclude: ["src/tests/**"],
    },
    environment: "node",
    globals: true,
    setupFiles: ["./src/tests/setup.ts"],
  },
});
