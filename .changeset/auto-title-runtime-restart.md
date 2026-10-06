---
"@assistant-ui/core": patch
---

a new thread still gets its automatic title when its runtime restarts (for example through `reloadMainThread()`) while its first `initialize()` is in flight
