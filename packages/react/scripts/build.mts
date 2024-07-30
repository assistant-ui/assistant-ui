import { build } from "tsup";
import { copyFileSync, mkdirSync } from "node:fs";

// JS
await build({
  entry: [
    "src/index.ts",
    "src/edge.ts",
    "src/tailwindcss/index.ts",
    "src/internal.ts",
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
});

// css

await build({
  entry: ["src/styles/index.css", "src/styles/modal.css"],
  outDir: "dist/styles",
  dts: true,
  sourcemap: true,
});

mkdirSync("dist/styles/tailwindcss", { recursive: true });
copyFileSync(
  "src/styles/tailwindcss/base-components.css",
  "dist/styles/tailwindcss/base-components.css",
);
copyFileSync(
  "src/styles/tailwindcss/thread.css",
  "dist/styles/tailwindcss/thread.css",
);
copyFileSync(
  "src/styles/tailwindcss/modal.css",
  "dist/styles/tailwindcss/modal.css",
);

mkdirSync("dist/styles/themes", { recursive: true });
copyFileSync("src/styles/themes/default.css", "dist/styles/themes/default.css");
