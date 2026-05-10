---
"@assistant-ui/core": patch
---

fix: `useExternalStoreRuntime` no longer crashes with "Entry not available in the store" when the adapter sets `threadId` to a value that isn't present in `threads`/`archivedThreads`. The runtime now synthesizes a regular thread item for `mainThreadId`, so thin adapters (e.g. `useAgUiRuntime`) that only expose `threadId` resolve correctly on first render and after switching threads. Closes #3971.
