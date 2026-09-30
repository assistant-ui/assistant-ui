---
"@assistant-ui/tap": patch
"@assistant-ui/store": patch
---

fix: run `useInsertionEffect` cleanups only when a resource is released for good, as React does, let `createTapRoot().unmount()` release a `mountOnSubscribe` root instead of throwing, and have `destroy()` release an assistant client's resources for good
