import { defineConfig } from "vitest/config";

// `react` resolves to tap's standalone shim, so this suite is the
// react-less integration proof for the whole chain: tap standalone shim,
// the store client entry (dist), and the Solid bridge. solid-js is inlined
// so the browser condition selects its reactive build instead of the
// server build Node resolves by default.
export default defineConfig({
  resolve: {
    conditions: ["browser", "development"],
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
        lines: 95,
        functions: 87,
        branches: 77,
        statements: 93,
        autoUpdate: (threshold, previous) =>
          Math.max(previous, Math.floor(threshold) - 1),
      },
    },
    environment: "jsdom",
    fsModuleCache: true,
    globals: true,
    server: {
      deps: {
        inline: [/solid-js/],
      },
    },
  },
});
