---
"@assistant-ui/core": patch
---

fix(core): replay the latched `initialize` thread event to late subscribers. `ensureInitialized` emits `initialize` once during construction, so a runtime seeded with non-empty `messages` (e.g. `useChatRuntime({ messages })` under `useRemoteThreadListRuntime`) fired it before the title binder's effect subscribed, and the `runEnd` → `generateTitle` wiring was never installed. `unstable_on("initialize", ...)` now schedules a one-off replay (on a microtask, re-checking the subscription) when the thread has already initialized, mirroring a BehaviorSubject, so late subscribers (the title binder, and `ThreadViewport`'s `thread.initialize` top-anchor reset) no longer miss it.
