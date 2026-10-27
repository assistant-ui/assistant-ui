---
"@assistant-ui/core": patch
---

fix: on the client thread list path, `reloadMainThread()` waits until the main item reports the remote ID the thread list announced for it, and a thread list item runtime's `updateCustom()` resolves once the item reports the new custom metadata, so a remount right after `initialize()` (from any entry point) or `updateCustom()` comes up on them. `initialize()` still resolves as soon as the adapter answers.
