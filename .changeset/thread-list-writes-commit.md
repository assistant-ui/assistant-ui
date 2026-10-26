---
"@assistant-ui/core": patch
---

fix: on the client thread list path, a thread list item runtime's `initialize()` resolves once the item reports its remote ID, and its `updateCustom()` once it reports the new custom metadata, so `reloadMainThread()` right after either remounts the thread runtime on them. A new thread's first send still starts its run as soon as the adapter initializes the thread.
