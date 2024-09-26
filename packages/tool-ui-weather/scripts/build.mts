import { build } from "tsup";

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
