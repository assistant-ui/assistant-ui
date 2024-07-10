import { build } from "tsup";
import { copyFileSync, mkdirSync } from "node:fs";

// JS

await build({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  esbuildOptions: (options) => {
    options.banner = {
      js: '"use client";',
    };
  },
});

await build({
  entry: ["src/tailwindcss.ts"],
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
});

// css

await build({
  entry: [
    "src/styles/index.css",
    "src/styles/markdown.css",
    "src/styles/modal.css",
  ],
  outDir: "dist/styles",
});

mkdirSync("dist/tailwindcss/styles", { recursive: true });
copyFileSync(
  "src/styles/base-components.css",
  "dist/tailwindcss/styles/base-components.css",
);
copyFileSync("src/styles/thread.css", "dist/tailwindcss/styles/thread.css");
copyFileSync("src/styles/markdown.css", "dist/tailwindcss/styles/markdown.css");
copyFileSync("src/styles/modal.css", "dist/tailwindcss/styles/modal.css");

mkdirSync("dist/tailwindcss/themes", { recursive: true });
copyFileSync("src/themes/default.css", "dist/tailwindcss/themes/default.css");
