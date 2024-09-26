import { build } from "tsup";
import { copyFileSync, mkdirSync } from "node:fs";

// JS
await build({
  entry: ["src/index.ts", "src/edge.ts", "src/tailwindcss/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: true,
  esbuildOptions: (options, { format }) => {
    if (format === "esm") {
      options.banner = {
        js: '"use client";',
      };
    }
  },
});

// TODO find a way to bundle edge with the rest of the package
await build({
  entry: ["src/edge.ts"],
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
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
