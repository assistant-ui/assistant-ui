import { build } from "tsup";
import { copyFileSync, mkdirSync } from "node:fs";

// JS
await build({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  esbuildOptions: (options, { format }) => {
    if (format === "esm") {
      options.banner = {
        js: '"use client";',
      };
    }
  },
});

await build({
  entry: ["src/tailwindcss/index.ts"],
  outDir: "dist/tailwindcss",
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
});

// css

await build({
  entry: ["src/styles/tailwindcss/trieve.css"],
  outDir: "dist/styles",
});

mkdirSync("dist/styles/tailwindcss", { recursive: true });
copyFileSync(
  "src/styles/tailwindcss/trieve.css",
  "dist/styles/tailwindcss/trieve.css",
);
