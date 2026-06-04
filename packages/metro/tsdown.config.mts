import { defineConfig } from "tsdown";

// Metro loads babel transformers via CommonJS `require`, and a babel transformer
// must be synchronous — so this package emits CJS and bundles the (ESM)
// `"use generative"` compiler in, rather than requiring it across the ESM/CJS
// boundary at runtime. `@babel/*` stay external (declared deps, already CJS).
export default defineConfig({
  entry: ["src/index.ts", "src/transformer.ts"],
  format: "cjs",
  platform: "node",
  dts: { sourcemap: true },
  sourcemap: true,
  deps: {
    alwaysBundle: ["@assistant-ui/x-generative-compiler"],
    neverBundle: [/^@babel\//],
  },
});
