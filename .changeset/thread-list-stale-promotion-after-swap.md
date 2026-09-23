---
"@assistant-ui/core": patch
---

fix: drop a new thread whose `initialize()` answers after the thread-list adapter was replaced, and stop operations from sending the replaced adapter's remote id to the new adapter
