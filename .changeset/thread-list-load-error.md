---
"@assistant-ui/core": patch
---

fix(core): keep the thread list and report the error when a load fails. failed loads previously looked like an empty thread list; thread list state now exposes `loadError`, clears it when a later load starts, and in browsers retries a failed load once when the window comes back online or the document becomes visible again. React Native has neither event, so it keeps recovering through `reload()`.
