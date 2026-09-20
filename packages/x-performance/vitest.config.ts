import { defineConfig, type Plugin } from "vitest/config";
import { resolveRefSpecifier } from "./lib/ref-resolver";

const refRoot = process.env["AUI_PERF_REF_ROOT"];
const refPlugins: Plugin[] = refRoot
  ? [
      {
        name: "aui-perf-ref",
        enforce: "pre",
        resolveId(source) {
          return resolveRefSpecifier(refRoot, source);
        },
      },
    ]
  : [];

export default defineConfig({
  plugins: refPlugins,
  test: {
    environment: "jsdom",
    pool: "forks",
    execArgv: ["--expose-gc"],
    // Headroom against CI contention on this package's synchronous
    // React/jsdom contract tests, not part of any contract's own budget.
    testTimeout: 20000,
    include: [
      "src/**/*.test.{ts,tsx}",
      "lib/**/*.test.{ts,tsx}",
      "contracts/**/*.test.{ts,tsx}",
    ],
    benchmark: {
      include: ["bench/**/*.bench.{ts,tsx}"],
    },
    server: {
      deps: {
        // Benches import built packages; serve dist as plain Node modules so
        // vitest's evaluator doesn't skew numbers.
        external: [
          /\/packages\/(tap|core|store|assistant-stream|react|react-markdown|ai-sdk)\/dist\//,
          /\/streamfold\/src\//,
        ],
      },
    },
  },
});
