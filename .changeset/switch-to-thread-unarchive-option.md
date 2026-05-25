---
"@assistant-ui/react": patch
---

feat: opt-out of auto-unarchive when switching threads

`switchToThread` (and `ThreadListItemRuntime.switchTo`) now accept an optional `{ unarchive?: boolean }` argument. The default remains `true`, preserving the existing behavior of auto-unarchiving an archived thread when it becomes the main thread. Pass `unarchive: false` to keep the thread archived after switching — useful when the UI lets users preview an archived conversation without restoring it.

```ts
// existing behavior — archived thread becomes regular
await threadList.switchToThread(threadId);

// new — keep status as archived
await threadList.switchToThread(threadId, { unarchive: false });

// same option on the item runtime
await threadListItem.switchTo({ unarchive: false });
```
