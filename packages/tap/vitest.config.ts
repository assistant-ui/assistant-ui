import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const packageRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "dev",
          environment: "jsdom",
          include: ["src/**/*.test.{ts,tsx}"],
          globals: true,
        },
      },
      {
        // Proves the react-free path: `react` resolves to the standalone shim,
        // so these tests fail if real React sneaks back into the shim's graph.
        resolve: {
          alias: [
            {
              find: /^react\/compiler-runtime$/,
              replacement: resolve(
                packageRoot,
                "src/standalone-shim/compiler-runtime.ts",
              ),
            },
            {
              find: /^react$/,
              replacement: resolve(packageRoot, "src/standalone-shim/index.ts"),
            },
          ],
        },
        test: {
          name: "standalone",
          environment: "node",
          include: ["src/__tests__/**/*.e2e.ts"],
          globals: true,
        },
      },
      {
        // Runs the differential parity suite against the production React
        // build with tap's dev-mode (strict emulation) compiled out.
        test: {
          name: "prod",
          environment: "jsdom",
          include: ["src/__tests__/parity/*.test.{ts,tsx}"],
          globals: true,
          env: { NODE_ENV: "production" },
          server: {
            deps: {
              // The host benchmark imports the built package; serve dist as a
              // plain Node module so vitest's evaluator doesn't skew numbers.
              external: [/packages\/tap\/dist\//],
            },
          },
        },
      },
    ],
  },
});
