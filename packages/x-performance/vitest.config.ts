import { join } from "node:path";
import { defineConfig } from "vitest/config";

const refRoot = process.env["AUI_PERF_REF_ROOT"];
const refAlias = refRoot
  ? [
      {
        find: /^@assistant-ui\/tap$/,
        replacement: join(refRoot, "packages/tap/dist/index.js"),
      },
      {
        find: /^@assistant-ui\/core$/,
        replacement: join(refRoot, "packages/core/dist/index.js"),
      },
      {
        find: /^assistant-stream$/,
        replacement: join(refRoot, "packages/assistant-stream/dist/index.js"),
      },
    ]
  : [];

export default defineConfig({
  resolve: {
    alias: refAlias,
  },
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
