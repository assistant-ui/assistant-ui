import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    benchmark: {
      include: ["bench/**/*.bench.{ts,tsx}"],
    },
    server: {
      deps: {
        // Benches import built packages; serve dist as plain Node modules so
        // vitest's evaluator doesn't skew numbers.
        external: [/packages\/(tap|core|assistant-stream)\/dist\//],
      },
    },
  },
});
