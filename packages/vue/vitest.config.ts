import { defineConfig } from "vitest/config";

// `react` resolves to tap's standalone shim, so this suite is the
// react-less integration proof for the whole chain: tap standalone shim,
// the store client entry (dist), and the Vue bridge.
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
    environment: "jsdom",
    globals: true,
  },
});
