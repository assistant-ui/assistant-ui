---
"@assistant-ui/core": patch
---

fix: on the client thread list path, `reloadMainThread()` waits until the thread list reports the remote ID of an `initialize()` that resolved before it, and a thread list item runtime's `updateCustom()` resolves once the item reports the new custom metadata, so a remount right after either comes up on them. `initialize()` still resolves as soon as the adapter answers.
