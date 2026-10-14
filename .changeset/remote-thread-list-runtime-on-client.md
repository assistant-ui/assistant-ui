---
"@assistant-ui/core": patch
---

feat: run `useRemoteThreadListRuntime` on the `RemoteThreadList` store client unless the adapter sets `unstable_Provider`, so both thread list paths share one implementation. The thread list still lives as long as the returned runtime. After a failed first load, a controlled `threadId` change no longer reloads the list; call `reload()` to retry. `RemoteThreadListThreadListRuntimeCore` is deprecated for direct use.
