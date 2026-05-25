import { build } from "tsdown";
import { restoreReferenceDirectives } from "./reference-directives";

await build({
  entry: ["src/**/*.{ts,tsx}", "!src/**/__tests__/**", "!src/**/*.test.{ts,tsx}"],
  platform: "neutral",
  unbundle: true,
  deps: { skipNodeModulesBundle: true },
  hooks: {
    "build:done": restoreReferenceDirectives,
  },
});

