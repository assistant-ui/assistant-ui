---
"@assistant-ui/core": patch
---

fix: `useExternalStoreRuntime` now correctly initializes `mainThreadId`, `threadIds`, and `archivedThreadIds` from the adapter on first render. Previously they stayed at `DEFAULT_THREAD_ID` until the user switched threads, so `isMain` was `false` on initial load. Closes #2577.
