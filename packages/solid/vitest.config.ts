import { configDefaults, defineConfig } from "vitest/config";

// `react` resolves to tap's standalone shim, so this suite is the
// react-less integration proof for the whole chain: tap standalone shim,
// the store client entry (dist), and the Solid bridge. The browser project
// inlines solid-js so its browser condition selects the reactive build.
export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^react\/compiler-runtime$/,
        replacement: "@assistant-ui/tap/standalone-shim/compiler-runtime",
      },
      { find: /^react$/, replacement: "@assistant-ui/tap/standalone-shim" },
    ],
  },
  test: {
    coverage: {
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/testUtils.ts"],
      thresholds: {
        lines: 98,
        functions: 97,
        branches: 94,
        statements: 98,
        autoUpdate: (threshold, previous) =>
          Math.max(previous, Math.floor(threshold) - 1),
      },
    },
    fsModuleCache: true,
    globals: true,
    projects: [
      {
        resolve: { conditions: ["browser", "development"] },
        test: {
          name: "jsdom",
          environment: "jsdom",
          exclude: [...configDefaults.exclude, "src/**/*.ssr.test.ts"],
          server: {
            deps: { inline: [/solid-js/] },
          },
        },
      },
      {
        test: {
          name: "server",
          environment: "node",
          include: ["src/**/*.ssr.test.ts"],
        },
      },
    ],
  },
});
