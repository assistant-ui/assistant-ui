---
"@assistant-ui/core": patch
---

fix: let replacement history adapters copy messages while a previous adapter's write is pending, and keep late completions from releasing the current adapter's write lock.
