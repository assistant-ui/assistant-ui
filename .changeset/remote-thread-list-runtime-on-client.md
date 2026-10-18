---
"@assistant-ui/core": patch
---

feat: run `useRemoteThreadListRuntime` on the `RemoteThreadList` store client unless the adapter it mounts with sets `unstable_Provider`, so both thread list paths share one implementation. a runtime that mounts without `unstable_Provider` serves later adapters through `unstable_useAdapters` and warns in development when one only has `unstable_Provider`. The thread list still lives as long as the returned runtime. After a failed first load, a controlled `threadId` change no longer reloads the list; call `reload()` to retry. `RemoteThreadListThreadListRuntimeCore` is deprecated for direct use.
