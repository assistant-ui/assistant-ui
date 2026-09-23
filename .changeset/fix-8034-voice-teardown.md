---
"@assistant-ui/core": patch
"@assistant-ui/store": patch
"@assistant-ui/tap": patch
---

fix: end voice sessions when a runtime hook's host is deleted. tap's `useInsertionEffect` now cleans up only on a permanent unmount, as in React; `unmount()` releases a `mountOnSubscribe` root for good, and a client's `destroy()` runs those cleanups
