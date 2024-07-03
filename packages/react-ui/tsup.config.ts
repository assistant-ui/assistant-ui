import { defineConfig } from "tsup";

export default defineConfig(() => {
  return {
    entry: [
      "src/index.ts",
      "src/styles.css",
      "src/markdown-styles.css",
      "src/theme/default.css",
    ],
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
    clean: true,
    esbuildOptions: (options) => {
      options.banner = {
        js: '"use client";',
      };
    },
  };
});
