---
"@assistant-ui/x-buildutils": patch
"@assistant-ui/store": patch
"@assistant-ui/tap": patch
---

build(x-buildutils): migrate `aui-build` from `ts.createProgram` to `tsdown` with `unbundle: true`

Tsdown drives both JS and `.d.ts` emission. Reference-directive restoration is preserved (tsdown/oxc drop `/// <reference>` lines, so we re-inject them in a `build:done` hook). `deps.skipNodeModulesBundle: true` keeps the old "never bundle anything from `node_modules`" behavior — devDependencies stay external instead of getting inlined into `dist`.

Side fixes the new strict dts pipeline surfaced:

- `@assistant-ui/tap`: dropped the `fnSymbol` brand from the public `ResourceElement` type. It referenced an `@internal` symbol that `stripInternal` removed from emit, leaving the published `.d.ts` with a dangling reference.
- `@assistant-ui/store`: un-marked `ClientSchema` as `@internal`. It was already re-exported from the public package index; treating the re-export as authoritative.
