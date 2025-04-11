import { build } from "tsup";

// JS
await build({
  entry: ["src/index.ts", "src/ai-sdk.ts", "src/utils.ts"],
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
});
