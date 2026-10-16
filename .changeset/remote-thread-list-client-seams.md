---
"@assistant-ui/core": patch
---

feat: add the internal `RemoteThreadList` seams that `useRemoteThreadListRuntime` needs to run on the store client. a plain `RemoteThreadList` now aborts a thread's pending send when that thread is deleted, detached or dropped by an adapter-replacing reload, as `InMemoryThreadList` and `useRemoteThreadListRuntime` already do, and logs a failed automatic title the way `useRemoteThreadListRuntime` does
