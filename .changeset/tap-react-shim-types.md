---
"@assistant-ui/tap": patch
"@assistant-ui/x-buildutils": patch
---

`@assistant-ui/tap/react-shim` and `@assistant-ui/tap/react-shim/compiler-runtime` now ship type declarations, so `import { useEffect } from "@assistant-ui/tap/react-shim"` type-checks without a hand-written module declaration. Each export of the shim is typed as React's export of the same name, and a hook missing from the installed `@types/react` (such as `useEffectEvent` under React 18) keeps the shim's own looser type. `aui-build` writes these types when it builds tap.
