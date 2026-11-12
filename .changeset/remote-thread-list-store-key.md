---
"@assistant-ui/core": patch
---

Add an optional `storeKey` on `RemoteThreadListAdapter` so a recreated adapter for the same store keeps in-flight thread-list mutations and their optimistic updates.
