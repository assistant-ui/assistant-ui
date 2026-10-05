import { defineConfig, type Plugin } from "vitest/config";
import { resolveRefSpecifier } from "./lib/ref-resolver";

// tinybench's defaults (1 s and at least 64 iterations per task, plus 250 ms of warm-up) triple the suite's wall time. Verdicts rest on the spread between interleaved runs, which more samples inside one run do not narrow.
const benchSampling = {
  time: 500,
  iterations: 10,
  warmupTime: 100,
  warmupIterations: 5,
};

declare module "vitest" {
  export interface ProvidedContext {
    benchSampling: typeof benchSampling;
  }
}

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
    provide: { benchSampling },
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
          /\/packages\/(tap|core|store|assistant-stream|react|react-markdown|react-langgraph|ai-sdk)\/dist\//,
        ],
      },
    },
  },
});
