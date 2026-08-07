import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

// The assistant-ui runtime is written against react hook imports but runs on
// @assistant-ui/tap; aliasing react to the standalone shim resolves it with
// no React installed.
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: [
      {
        find: /^react\/compiler-runtime$/,
        replacement: "@assistant-ui/tap/standalone-shim/compiler-runtime",
      },
      { find: /^react$/, replacement: "@assistant-ui/tap/standalone-shim" },
    ],
  },
});
