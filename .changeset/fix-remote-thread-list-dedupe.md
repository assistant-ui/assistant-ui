---
"@assistant-ui/react": patch
---

Fix duplicate thread entries in the sidebar when `switchToThread(id)` races
with `list()` resolving. `RemoteThreadListThreadListRuntimeCore.switchToThread`
now checks whether the id already exists in `threadIds` / `archivedThreadIds`
before appending, making the operation idempotent.