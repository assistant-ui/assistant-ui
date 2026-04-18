---
"@assistant-ui/core": patch
---

fix: `useExternalStoreRuntime` now initializes `mainThreadId`, `threadIds`, and `archivedThreadIds` from the adapter on first render. Previously they stayed at `DEFAULT_THREAD_ID` / `["DEFAULT_THREAD_ID"]` until the user switched threads, so every `ThreadListItem` had `isMain === false` on initial load. Root cause: the constructor used a TS parameter-property shorthand that assigned `this.adapter = adapter` before the body ran, making `previousAdapter === adapter` inside `__internal_setAdapter` so every `previousX !== newX` early-return condition collapsed. Closes #2577.
