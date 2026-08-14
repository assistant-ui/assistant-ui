---
"@assistant-ui/core": patch
"@assistant-ui/store": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
---

feat: new `threads.selectionChanged` event carrying `threadId` and `previousThreadId`; deprecate `threadListItem.switchedTo`/`switchedAway` in its favor. Un-deprecate the semantically meaningful events (`thread.runStart`, `thread.runEnd`, `thread.initialize`, `composer.send`, `composer.attachmentAdd`).

The new event fires in situations where the deprecated pair did not, so the selection-driven defaults (`scrollToBottomOnThreadSwitch`, `unstable_focusOnThreadSwitched`) now engage there too: `InMemoryThreadList` emits on selection changes (it previously emitted no switch events at all), `switchToNewThread()` emits for the newly created thread, and runtimes that resolve a deep-linked `threadId`/`initialThreadId` after mount (`useRemoteThreadListRuntime`) emit when the deep link resolves, with the initial placeholder thread as `previousThreadId`.
