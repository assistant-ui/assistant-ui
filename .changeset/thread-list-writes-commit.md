---
"@assistant-ui/core": patch
---

fix: on the client thread list path, `initialize()` resolves once the thread list item reports its remote ID, and a thread list item runtime's `updateCustom()` once it reports the new custom metadata, so `reloadMainThread()` right after `initialize()` remounts the thread runtime on its remote ID.
