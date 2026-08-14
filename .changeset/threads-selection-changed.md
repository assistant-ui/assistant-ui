---
"@assistant-ui/core": patch
"@assistant-ui/store": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
---

feat: new `threads.selectionChanged` event carrying `threadId` and `previousThreadId`; deprecate `threadListItem.switchedTo`/`switchedAway` in its favor. Un-deprecate the semantically meaningful events (`thread.runStart`, `thread.runEnd`, `thread.initialize`, `composer.send`, `composer.attachmentAdd`).
