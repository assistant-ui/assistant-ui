import { build } from "tsup";

// JS
await build({
  entry: ["src/index.ts", "src/ai-sdk.ts"],
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
});
