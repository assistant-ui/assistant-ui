import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/tests/**"],
    },
    environment: "node",
    globals: true,
    setupFiles: ["./src/tests/setup.ts"],
  },
});
