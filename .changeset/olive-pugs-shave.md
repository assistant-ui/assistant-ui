---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
---

feat: expose `threadListItem.isRunning` so a thread list row can show its own run

a thread list row had no supported way to tell whether its thread was running: `thread.isRunning` describes the open thread, and the item state carried no run state at all, so a run continuing on a thread the user had switched away from was invisible.

`threadListItem.isRunning` now reports it, and stays true for a background run. runtimes that keep background threads alive answer it through the new optional `ThreadListRuntimeCore.unstable_isThreadRunning`; the rest report the open thread's run state, which they already track.

`InMemoryThreadList` also renames threads for real instead of dropping the new title.
