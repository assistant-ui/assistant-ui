import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/ui/index.ts"],
  bundle: true,
  outfile: "dist/bundle.js",
  format: "esm",
  minify: true,
  platform: "browser",
  // Define node:process to prevent runtime errors
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  // Alias node:process to a browser-safe empty module
  alias: {
    "node:process": "./scripts/process-shim.mjs",
  },
});

console.log("UI bundle built successfully!");
