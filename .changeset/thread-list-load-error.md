---
"@assistant-ui/core": patch
---

fix(core): keep the thread list and report the error when a load fails. failed loads previously looked like an empty thread list; thread list state now exposes `loadError` and clears it when a later load starts.
