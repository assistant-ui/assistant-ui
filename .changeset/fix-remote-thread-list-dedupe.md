---
"@assistant-ui/core": patch
---

fix(core): `switchToThread` could duplicate a thread or leave it in both `threadIds` and `archivedThreadIds` when it raced with `list()`. Both arrays are now filtered before the status-keyed append, matching the `updateStatusReducer` pattern.
