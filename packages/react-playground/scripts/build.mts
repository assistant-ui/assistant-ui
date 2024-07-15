import { build } from "tsup";

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

// await build({
//   entry: ["src/tailwindcss/index.ts"],
//   outDir: "dist/tailwindcss",
//   format: ["cjs", "esm"],
//   dts: true,
//   sourcemap: true,
// });

// // css

// await build({
//   entry: ["src/styles/tailwindcss/markdown.css"],
//   outDir: "dist/styles",
// });

// mkdirSync("dist/styles/tailwindcss", { recursive: true });
// copyFileSync(
//   "src/styles/tailwindcss/markdown.css",
//   "dist/styles/tailwindcss/markdown.css",
// );
