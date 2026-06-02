import { build } from "tsdown";
import { preserveReferenceDirectives } from "./reference-directives";

await build({
  entry: [
    "src/**/*.{ts,tsx}",
    "!src/**/__tests__/**",
    "!src/**/*.test.{ts,tsx}",
  ],
  platform: "neutral",
  unbundle: true,
  deps: { neverBundle: /^node:/, skipNodeModulesBundle: true },
  dts: { sourcemap: true },
  sourcemap: true,
  plugins: [preserveReferenceDirectives()],
});
