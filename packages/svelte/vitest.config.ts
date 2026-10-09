import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// `react` resolves to tap's standalone shim, so this suite is the
// react-less integration proof for the whole chain: tap standalone shim,
// the store client entry (dist), and the Svelte bridge. The svelte plugin
// compiles test fixtures only; the shipped package is plain TypeScript.
export default defineConfig({
  plugins: [svelte()],
  resolve: {
    conditions: ["browser"],
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
      include: ["src/**/*.{ts,tsx,svelte}"],
      exclude: ["src/__tests__/**"],
      thresholds: {
        lines: 94,
        functions: 90,
        branches: 80,
        statements: 92,
        autoUpdate: (threshold) => Math.max(0, Math.floor(threshold) - 1),
      },
    },
    environment: "jsdom",
    pool: "threads",
    fsModuleCache: true,
    globals: true,
  },
});
