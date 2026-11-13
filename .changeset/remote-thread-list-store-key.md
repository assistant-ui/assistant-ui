---
"@assistant-ui/core": patch
---

Add an optional `storeKey` on `RemoteThreadListAdapter` so a recreated adapter for the same store keeps in-flight thread-list mutations and their optimistic updates on the `RemoteThreadList` client. `useRemoteThreadListRuntime` with an adapter that has `unstable_Provider` runs on the deprecated class core, which ignores `storeKey`.
