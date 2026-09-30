---
"@assistant-ui/tap": patch
---

fix: run `useInsertionEffect` cleanups only when a resource is released for good, as React does, and let `createTapRoot().unmount()` release a `mountOnSubscribe` root instead of throwing
