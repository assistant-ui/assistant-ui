import { defineConfig } from "tsup";

export default defineConfig(() => {
  return {
    entry: [
      "src/index.ts",
      "src/styles.css",
      "src/markdown-styles.css",
      "src/themes/default.css",
      "src/themes/shadcn.css",
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
